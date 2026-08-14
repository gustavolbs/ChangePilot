import type {
  Response,
  ResponseStreamEvent,
  ResponseTextDeltaEvent,
} from "openai/resources/responses/responses.mjs";
import { describe, expect, it, vi } from "vitest";

import type { GenerationRequest } from "../../generation/generation.js";
import type { GenerationStreamEvent } from "../../generation/streaming-generation.js";
import { createGenerationParameters } from "../../labs/generation-parameters.js";
import { createMessageSequence } from "../../labs/message-sequence.js";
import {
  createOpenAIStreamingGenerationAdapter,
  type OpenAIStreamingGenerationAdapterOptions,
} from "./openai-streaming-generation-adapter.js";

type OpenAIStreamingRequest = Parameters<
  OpenAIStreamingGenerationAdapterOptions["createStream"]
>[0];

const model = "gpt-5.1";

const request: GenerationRequest = {
  messages: createMessageSequence(
    "Review only the supplied repository evidence.",
    [],
    "Review src/auth/session.ts.",
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

const createProviderResponse = (
  overrides: Partial<Response> = {},
): Response => ({
  id: "resp_stream_123",
  created_at: 1_786_640_400,
  output_text: "Review completed.",
  error: null,
  incomplete_details: null,
  instructions: "Review only the supplied repository evidence.",
  metadata: null,
  model,
  object: "response",
  output: [],
  parallel_tool_calls: false,
  temperature: 0,
  tool_choice: "auto",
  tools: [],
  top_p: 1,
  status: "completed",
  usage: {
    input_tokens: 12,
    output_tokens: 4,
    total_tokens: 16,
    input_tokens_details: {
      cache_write_tokens: 0,
      cached_tokens: 0,
    },
    output_tokens_details: {
      reasoning_tokens: 0,
    },
  },
  ...overrides,
});

const createTextDelta = (
  delta: string,
  sequenceNumber: number,
): ResponseTextDeltaEvent => ({
  type: "response.output_text.delta",
  content_index: 0,
  delta,
  item_id: "msg_stream_123",
  logprobs: [],
  output_index: 0,
  sequence_number: sequenceNumber,
});

const createCompleted = (
  response: Response = createProviderResponse(),
  sequenceNumber = 1,
): Extract<ResponseStreamEvent, { type: "response.completed" }> => ({
  type: "response.completed",
  response,
  sequence_number: sequenceNumber,
});

const createFakeStream = (
  events: readonly ResponseStreamEvent[],
): AsyncIterable<ResponseStreamEvent> => ({
  async *[Symbol.asyncIterator]() {
    for (const event of events) {
      yield event;
    }
  },
});

const createStreamFake = (events: readonly ResponseStreamEvent[]) =>
  vi.fn(async (_request: OpenAIStreamingRequest) => createFakeStream(events));

const collectEvents = async (
  stream: AsyncIterable<GenerationStreamEvent>,
): Promise<GenerationStreamEvent[]> => {
  const events: GenerationStreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  return events;
};

describe("createOpenAIStreamingGenerationAdapter", () => {
  it("sends the OpenAI request with stream enabled", async () => {
    const createStream = createStreamFake([createCompleted()]);
    const adapter = createOpenAIStreamingGenerationAdapter({
      model,
      createStream,
    });

    await collectEvents(adapter.stream(request));

    expect(createStream).toHaveBeenCalledTimes(1);
    expect(createStream.mock.calls[0]?.[0]).toMatchObject({
      model,
      stream: true,
    });
  });

  it("emits text deltas unchanged and in their original order", async () => {
    const deltas = ["  Review", " completed", ".\n"] as const;
    const createStream = createStreamFake([
      createTextDelta(deltas[0], 1),
      createTextDelta(deltas[1], 2),
      createTextDelta(deltas[2], 3),
      createCompleted(
        createProviderResponse({ output_text: deltas.join("") }),
        4,
      ),
    ]);
    const adapter = createOpenAIStreamingGenerationAdapter({
      model,
      createStream,
    });

    const events = await collectEvents(adapter.stream(request));

    expect(
      events
        .filter((event) => event.type === "text-delta")
        .map((event) => event.delta),
    ).toEqual(deltas);
  });

  it("emits exactly one finished event for response.completed", async () => {
    const createStream = createStreamFake([
      createTextDelta("Review", 1),
      createCompleted(createProviderResponse(), 2),
      createCompleted(createProviderResponse({ id: "must_not_emit" }), 3),
    ]);
    const adapter = createOpenAIStreamingGenerationAdapter({
      model,
      createStream,
    });

    const events = await collectEvents(adapter.stream(request));

    expect(events.filter((event) => event.type === "finished")).toHaveLength(1);
  });

  it("maps the completed response through the generation response contract", async () => {
    const providerResponse = createProviderResponse({
      id: "resp_stream_exact",
      model: "gpt-5.1-2025-11-13",
      output_text: "  Exact final output.\n",
      usage: {
        input_tokens: 101,
        output_tokens: 23,
        total_tokens: 124,
        input_tokens_details: {
          cache_write_tokens: 7,
          cached_tokens: 11,
        },
        output_tokens_details: {
          reasoning_tokens: 3,
        },
      },
    });
    const createStream = createStreamFake([createCompleted(providerResponse)]);
    const adapter = createOpenAIStreamingGenerationAdapter({
      model,
      createStream,
    });

    const events = await collectEvents(adapter.stream(request));

    expect(events).toEqual([
      {
        type: "finished",
        response: {
          id: "resp_stream_exact",
          model: "gpt-5.1-2025-11-13",
          outputText: "  Exact final output.\n",
          finishReason: "completed",
          usage: {
            inputTokens: 101,
            outputTokens: 23,
            totalTokens: 124,
          },
        },
      },
    ]);
  });

  it("rejects when the stream ends without response.completed", async () => {
    const createStream = createStreamFake([
      createTextDelta("Partial output", 1),
    ]);
    const adapter = createOpenAIStreamingGenerationAdapter({
      model,
      createStream,
    });

    await expect(collectEvents(adapter.stream(request))).rejects.toThrow(
      /stream.*ended.*without.*terminal|completed/i,
    );
    expect(createStream).toHaveBeenCalledTimes(1);
  });
});
