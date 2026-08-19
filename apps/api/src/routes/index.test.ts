import type {
  GenerationRequest,
  GenerationStreamEvent,
  GenerationStreamOptions,
  ModelPricing,
  MonotonicClock,
  StreamingGenerationAdapter,
} from "@changepilot/ai";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./index.js";

type FakeAdapterOptions = Readonly<{
  events?: readonly GenerationStreamEvent[];
  error?: unknown;
}>;

const pricing: ModelPricing = {
  inputUsdPerMillionTokens: 0.2,
  outputUsdPerMillionTokens: 1.2,
};

type FinishedEvent = Extract<GenerationStreamEvent, { type: "finished" }>;

const createFinishedEvent = (
  finishReason: FinishedEvent["response"]["finishReason"] = "completed",
): FinishedEvent => ({
  type: "finished",
  response: {
    id: `resp_api_${finishReason}`,
    model: "gpt-5.6-luna",
    outputText: "Review completed.",
    finishReason,
    usage: {
      inputTokens: 2_000,
      outputTokens: 1_000,
      totalTokens: 3_000,
    },
  },
});

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

const createFakeClock = (timestamps: readonly number[]): MonotonicClock => {
  let index = 0;

  return () => {
    const timestamp = timestamps[index];

    if (timestamp === undefined) {
      throw new Error("Fake clock has no timestamp available.");
    }

    index += 1;
    return timestamp;
  };
};

const postReview = (
  adapter: StreamingGenerationAdapter,
  changeDescription: string,
  now?: MonotonicClock,
) =>
  createApp(adapter, pricing, { now }).request("/reviews/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ changeDescription }),
  });

describe("API routes", () => {
  it("returns API health", async () => {
    const { adapter } = createFakeAdapter();
    const response = await createApp(adapter, pricing).request("/health");

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
    const event = createFinishedEvent();
    const { adapter } = createFakeAdapter({ events: [event] });
    const response = await postReview(adapter, "Increase session expiration.");

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      `event: finished\ndata: ${JSON.stringify(event)}\n\n`,
    );
  });

  it("logs usage and latency once after multiple deltas and a finished event", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);

    try {
      const events = [
        {
          type: "text-delta",
          delta: "Partial ",
        },
        {
          type: "text-delta",
          delta: "review.",
        },
        createFinishedEvent(),
      ] satisfies readonly GenerationStreamEvent[];
      const { adapter } = createFakeAdapter({ events });
      const now = createFakeClock([100, 125, 325, 725, 750]);
      const response = await postReview(
        adapter,
        "Increase session expiration.",
        now,
      );

      await response.text();

      const logs = consoleInfo.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );
      const usageLogs = logs.filter((log) => log.event === "ai.usage");
      const latencyLogs = logs.filter((log) => log.event === "ai.latency");

      expect(usageLogs).toHaveLength(1);
      expect(latencyLogs).toHaveLength(1);
      expect(latencyLogs[0]).toMatchObject({
        event: "ai.latency",
        requestId: "resp_api_completed",
        feature: "change-review",
        model: "gpt-5.6-luna",
        finishReason: "completed",
        latency: {
          timeToFirstTokenMs: 225,
          timeToLastTokenMs: 625,
          providerTimeToFirstTokenMs: 200,
          providerTimeToLastTokenMs: 600,
          providerDurationMs: 625,
          applicationPreparationMs: 25,
          totalDurationMs: 650,
        },
      });
    } finally {
      consoleInfo.mockRestore();
    }
  });

  it("logs usage for max-output-tokens", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);

    try {
      const { adapter } = createFakeAdapter({
        events: [createFinishedEvent("max-output-tokens")],
      });
      const now = createFakeClock([100, 125, 300]);
      const response = await postReview(
        adapter,
        "Increase session expiration.",
        now,
      );

      await response.text();

      const logs = consoleInfo.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );

      expect(logs.filter((log) => log.event === "ai.usage")).toHaveLength(1);
      expect(logs.filter((log) => log.event === "ai.latency")).toHaveLength(1);
    } finally {
      consoleInfo.mockRestore();
    }
  });

  it("logs null token latency metrics when finished arrives without deltas", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);

    try {
      const { adapter } = createFakeAdapter({
        events: [createFinishedEvent()],
      });
      const now = createFakeClock([100, 125, 300]);
      const response = await postReview(
        adapter,
        "Increase session expiration.",
        now,
      );

      await response.text();

      const logs = consoleInfo.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );
      const latencyLogs = logs.filter((log) => log.event === "ai.latency");

      expect(latencyLogs).toHaveLength(1);
      expect(latencyLogs[0]).toMatchObject({
        event: "ai.latency",
        latency: {
          timeToFirstTokenMs: null,
          timeToLastTokenMs: null,
          providerTimeToFirstTokenMs: null,
          providerTimeToLastTokenMs: null,
          providerDurationMs: 175,
          applicationPreparationMs: 25,
          totalDurationMs: 200,
        },
      });
    } finally {
      consoleInfo.mockRestore();
    }
  });

  it("transforms an adapter exception into an SSE error event", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);

    try {
      const partialEvent = {
        type: "text-delta",
        delta: "Partial content remains visible.",
      } satisfies GenerationStreamEvent;
      const { adapter } = createFakeAdapter({
        events: [partialEvent],
        error: new Error("Provider stream failed."),
      });
      const now = createFakeClock([100, 125, 325]);
      const response = await postReview(
        adapter,
        "Increase session expiration.",
        now,
      );

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
      const logs = consoleInfo.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );

      expect(logs.filter((log) => log.event === "ai.usage")).toHaveLength(0);
      expect(logs.filter((log) => log.event === "ai.latency")).toHaveLength(0);
    } finally {
      consoleInfo.mockRestore();
    }
  });
});
