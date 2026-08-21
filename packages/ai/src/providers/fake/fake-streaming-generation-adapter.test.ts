import { describe, expect, it } from "vitest";

import type { GenerationRequest } from "../../generation/generation.js";
import { collectGenerationStreamEvents } from "../../testing/collect-generation-stream-events.js";
import { createGenerationParameters } from "../../labs/generation-parameters.js";
import { createMessageSequence } from "../../labs/message-sequence.js";
import { createFakeStreamingGenerationAdapter } from "./fake-streaming-generation-adapter.js";
import { runStreamingGenerationAdapterContract } from "../../testing/streaming-generation-adapter-contract.js";

const request: GenerationRequest = {
  messages: createMessageSequence(
    "Review only the supplied change description.",
    [],
    "Review the local fake provider.",
  ),
  parameters: createGenerationParameters({
    sampling: {
      strategy: "temperature",
      temperature: 0,
    },
    maxOutputTokens: 500,
    stopSequences: [],
  }),
};

describe("createFakeStreamingGenerationAdapter", () => {
  runStreamingGenerationAdapterContract({
    name: "Fake",
    createAdapter: () =>
      createFakeStreamingGenerationAdapter({
        model: "fake-model",
        chunks: ["First ", "second."],
        createResponseId: () => "fake_response_1",
      }),
  });

  it("emits deterministic chunks followed by a completed response", async () => {
    const adapter = createFakeStreamingGenerationAdapter({
      model: "fake-review-v1",
      chunks: ["First ", "second."],
      createResponseId: () => "fake_response_1",
    });

    const events = await collectGenerationStreamEvents(adapter.stream(request));

    expect(events).toEqual([
      {
        type: "text-delta",
        delta: "First ",
      },
      {
        type: "text-delta",
        delta: "second.",
      },
      {
        type: "finished",
        response: {
          id: "fake_response_1",
          model: "fake-review-v1",
          outputText: "First second.",
          finishReason: "completed",
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
        },
      },
    ]);
  });

  it("cancels between chunks using the shared generation contract", async () => {
    const adapter = createFakeStreamingGenerationAdapter({
      model: "fake-review-v1",
      chunks: ["First ", "second."],
      createResponseId: () => "fake_response_1",
    });
    const controller = new AbortController();
    const iterator = adapter
      .stream(request, {
        signal: controller.signal,
      })
      [Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({
      value: {
        type: "text-delta",
        delta: "First ",
      },
      done: false,
    });

    controller.abort();

    await expect(iterator.next()).rejects.toMatchObject({
      code: "cancelled",
      retryable: false,
    });
  });
});
