import {
  GenerationError,
  type GenerationRequest,
  type GenerationStreamEvent,
  type GenerationStreamOptions,
  type ModelPricing,
  type MonotonicClock,
  type StreamingGenerationAdapter,
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

const createAbortAwareAdapter = () => {
  const stream = vi.fn(
    (_request: GenerationRequest, options?: GenerationStreamOptions) =>
      (async function* (): AsyncIterable<GenerationStreamEvent> {
        const signal = options?.signal;

        if (!signal) {
          throw new Error("Adapter did not receive an AbortSignal.");
        }

        await new Promise<void>((_resolve, reject) => {
          const rejectAsAborted = () => reject(new Error("Adapter aborted."));

          if (signal.aborted) {
            rejectAsAborted();
            return;
          }

          signal.addEventListener("abort", rejectAsAborted, { once: true });
        });
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
  options: Readonly<{
    now?: MonotonicClock;
    generationTimeoutMs?: number;
  }> = {},
) =>
  createApp(adapter, pricing, options).request("/reviews/stream", {
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

  it("returns 400 for an invalid request body", async () => {
    const { adapter, stream } = createFakeAdapter();
    const response = await createApp(adapter, pricing).request(
      "/reviews/stream",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{invalid-json",
      },
    );

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
        { now },
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
        { now },
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
        { now },
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

  it("preserves deltas and maps a provider error without logging usage or latency", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      const partialEvent = {
        type: "text-delta",
        delta: "Partial content remains visible.",
      } satisfies GenerationStreamEvent;
      const { adapter } = createFakeAdapter({
        events: [partialEvent],
        error: new GenerationError({
          code: "provider-unavailable",
          message: "Provider stream failed.",
          retryable: true,
        }),
      });
      const now = createFakeClock([100, 125, 325]);
      const response = await postReview(
        adapter,
        "Increase session expiration.",
        { now },
      );

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe(
        [
          `event: text-delta\ndata: ${JSON.stringify(partialEvent)}\n\n`,
          `event: error\ndata: ${JSON.stringify({
            type: "error",
            code: "provider-unavailable",
            message: "The AI provider is temporarily unavailable.",
            retryable: true,
          })}\n\n`,
        ].join(""),
      );
      const infoLogs = consoleInfo.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );
      const errorLogs = consoleError.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );

      expect(errorLogs.filter((log) => log.event === "ai.error")).toHaveLength(
        1,
      );
      expect(infoLogs.filter((log) => log.event === "ai.usage")).toHaveLength(
        0,
      );
      expect(infoLogs.filter((log) => log.event === "ai.latency")).toHaveLength(
        0,
      );
    } finally {
      consoleInfo.mockRestore();
      consoleError.mockRestore();
    }
  });

  it("aborts the adapter and emits a retryable timeout error", async () => {
    vi.useFakeTimers();
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      const { adapter, stream } = createAbortAwareAdapter();
      const response = await postReview(
        adapter,
        "Increase session expiration.",
        { generationTimeoutMs: 1_000 },
      );
      const responseText = response.text();

      await vi.advanceTimersByTimeAsync(1_000);

      expect(stream.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      await expect(responseText).resolves.toBe(
        `event: error\ndata: ${JSON.stringify({
          type: "error",
          code: "timeout",
          message: "The review took too long and was stopped.",
          retryable: true,
        })}\n\n`,
      );

      const infoLogs = consoleInfo.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );
      const errorLogs = consoleError.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );

      expect(errorLogs.filter((log) => log.event === "ai.error")).toHaveLength(
        1,
      );
      expect(infoLogs.filter((log) => log.event === "ai.usage")).toHaveLength(
        0,
      );
      expect(infoLogs.filter((log) => log.event === "ai.latency")).toHaveLength(
        0,
      );
    } finally {
      consoleInfo.mockRestore();
      consoleError.mockRestore();
      vi.useRealTimers();
    }
  });

  it("aborts the adapter and logs cancellation without logging an error", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      const { adapter, stream } = createAbortAwareAdapter();
      const response = await postReview(
        adapter,
        "Increase session expiration.",
      );
      const reader = response.body?.getReader();

      expect(reader).toBeDefined();
      const pendingRead = reader?.read();

      await vi.waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
      await reader?.cancel();
      await pendingRead;
      await vi.waitFor(() =>
        expect(stream.mock.calls[0]?.[1]?.signal?.aborted).toBe(true),
      );

      const infoLogs = consoleInfo.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );
      const errorLogs = consoleError.mock.calls.map(([message]) =>
        JSON.parse(String(message)),
      );

      expect(
        infoLogs.filter((log) => log.event === "ai.cancelled"),
      ).toHaveLength(1);
      expect(errorLogs.filter((log) => log.event === "ai.error")).toHaveLength(
        0,
      );
      expect(infoLogs.filter((log) => log.event === "ai.usage")).toHaveLength(
        0,
      );
      expect(infoLogs.filter((log) => log.event === "ai.latency")).toHaveLength(
        0,
      );
    } finally {
      consoleInfo.mockRestore();
      consoleError.mockRestore();
    }
  });
});
