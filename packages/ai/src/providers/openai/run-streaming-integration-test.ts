import assert from "node:assert/strict";

import OpenAI from "openai";

import { createGenerationParameters } from "../../generation/generation-parameters.js";
import { createMessageSequence } from "../../generation/message-sequence.js";
import { collectGenerationStreamEvents } from "../../testing/collect-generation-stream-events.js";
import { createOpenAIStreamingGenerationAdapter } from "./openai-streaming-generation-adapter.js";

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const runOpenAIStreamingIntegrationTest = async (): Promise<void> => {
  const model = getRequiredEnvironmentVariable("OPENAI_MODEL");
  const apiKey = getRequiredEnvironmentVariable("OPENAI_API_KEY");

  const client = new OpenAI({
    apiKey,
    maxRetries: 0,
  });

  const adapter = createOpenAIStreamingGenerationAdapter({
    model,
    createStream: (request, options) =>
      client.responses.create(request, {
        signal: options,
      }),
  });

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30_000);

  try {
    const events = await collectGenerationStreamEvents(
      adapter.stream(
        {
          messages: createMessageSequence(
            "Reply with one short sentence.",
            [],
            "Confirm that streaming works.",
          ),
          parameters: createGenerationParameters({
            sampling: {
              strategy: "temperature",
              temperature: 0,
            },
            maxOutputTokens: 200,
            stopSequences: [],
          }),
        },
        {
          signal: controller.signal,
        },
      ),
    );

    const textDeltaEvents = events.filter(
      (event) => event.type === "text-delta",
    );

    const finishedEvents = events.filter((event) => event.type === "finished");

    assert.ok(
      textDeltaEvents.length > 0,
      "Expected at least one text-delta event.",
    );

    assert.equal(
      finishedEvents.length,
      1,
      "Expected exactly one finished event.",
    );

    assert.equal(
      events.at(-1)?.type,
      "finished",
      "Expected finished to be the last event.",
    );

    const finishedEvent = finishedEvents[0];

    assert.ok(finishedEvent);
    assert.equal(finishedEvent.type, "finished");

    const concatenatedDeltas = textDeltaEvents
      .map((event) => event.delta)
      .join("");

    assert.equal(
      concatenatedDeltas,
      finishedEvent.response.outputText,
      "Concatenated deltas do not match the final output.",
    );

    assert.ok(
      finishedEvent.response.outputText.trim().length > 0,
      "Expected a non-empty output.",
    );

    const { response } = finishedEvent;

    console.log({
      provider: "openai",
      model: response.model,
      textDeltaEvents: textDeltaEvents.length,
      finalEvent: finishedEvent.type,
      finishReason: response.finishReason,
      concatenatedDeltasMatchFinalOutput:
        concatenatedDeltas === response.outputText,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
    });
  } finally {
    clearTimeout(timeout);
  }
};

await runOpenAIStreamingIntegrationTest();
