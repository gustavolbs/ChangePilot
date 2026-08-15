import type {
  GenerationRequest,
  GenerationStreamEvent,
  GenerationStreamOptions,
  StreamingGenerationAdapter,
} from "@changepilot/ai";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./index.js";

type FakeAdapterOptions = Readonly<{
  events?: readonly GenerationStreamEvent[];
  error?: unknown;
}>;

const createFakeAdapter = ({ events = [], error }: FakeAdapterOptions = {}) => {
  const stream = vi.fn(
    (_request: GenerationRequest, _options?: GenerationStreamOptions) =>
      (async function* (): AsyncIterable<GenerationStreamEvent> {
        for (const event of events) {
          yield event;
        }

        if (error !== undefined) {
          throw error;
        }
      })(),
  );
  const adapter: StreamingGenerationAdapter = { stream };

  return { adapter, stream };
};

const postReview = (
  adapter: StreamingGenerationAdapter,
  changeDescription: string,
) =>
  createApp(adapter).request("/reviews/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ changeDescription }),
  });

describe("API routes", () => {
  it("returns API health", async () => {
    const { adapter } = createFakeAdapter();
    const response = await createApp(adapter).request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "changepilot-api",
    });
  });

  it("returns 400 for an empty change description", async () => {
    const { adapter, stream } = createFakeAdapter();
    const response = await postReview(adapter, "   ");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "changeDescription is required.",
    });
    expect(stream).not.toHaveBeenCalled();
  });

  it("transforms a text-delta into an SSE event", async () => {
    const event = {
      type: "text-delta",
      delta: "  Partial review.\n",
    } satisfies GenerationStreamEvent;
    const { adapter } = createFakeAdapter({ events: [event] });
    const response = await postReview(adapter, "Increase session expiration.");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toBe(
      `event: text-delta\ndata: ${JSON.stringify(event)}\n\n`,
    );
  });

  it("streams the finished event", async () => {
    const event = {
      type: "finished",
      response: {
        id: "resp_api_123",
        model: "gpt-5.1",
        outputText: "Review completed.",
        finishReason: "completed",
        usage: {
          inputTokens: 20,
          outputTokens: 5,
          totalTokens: 25,
        },
      },
    } satisfies GenerationStreamEvent;
    const { adapter } = createFakeAdapter({ events: [event] });
    const response = await postReview(adapter, "Increase session expiration.");

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      `event: finished\ndata: ${JSON.stringify(event)}\n\n`,
    );
  });

  it("transforms an adapter exception into an SSE error event", async () => {
    const partialEvent = {
      type: "text-delta",
      delta: "Partial content remains visible.",
    } satisfies GenerationStreamEvent;
    const { adapter } = createFakeAdapter({
      events: [partialEvent],
      error: new Error("Provider stream failed."),
    });
    const response = await postReview(adapter, "Increase session expiration.");

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      [
        `event: text-delta\ndata: ${JSON.stringify(partialEvent)}\n\n`,
        `event: error\ndata: ${JSON.stringify({
          type: "error",
          message: "Provider stream failed.",
        })}\n\n`,
      ].join(""),
    );
  });
});
