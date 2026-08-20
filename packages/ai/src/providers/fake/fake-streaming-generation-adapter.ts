import { GenerationError } from "../../generation/generation-error.js";
import type { StreamingGenerationAdapter } from "../../generation/streaming-generation.js";

export type FakeStreamingGenerationAdapterOptions = Readonly<{
  model: string;
  chunks: readonly string[];
  createResponseId: () => string;
}>;

const throwIfAborted = (signal?: AbortSignal): void => {
  if (!signal?.aborted) {
    return;
  }

  throw new GenerationError({
    code: "cancelled",
    message: "Fake generation cancelled.",
    retryable: false,
    cause: signal.reason,
  });
};

export const createFakeStreamingGenerationAdapter = (
  options: FakeStreamingGenerationAdapterOptions,
): StreamingGenerationAdapter => {
  return {
    async *stream(_request, streamOptions) {
      let outputText = "";

      for (const chunk of options.chunks) {
        throwIfAborted(streamOptions?.signal);

        outputText += chunk;

        yield {
          type: "text-delta",
          delta: chunk,
        };
      }

      throwIfAborted(streamOptions?.signal);

      yield {
        type: "finished",
        response: {
          id: options.createResponseId(),
          model: options.model,
          outputText,
          finishReason: "completed",
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
        },
      };
    },
  };
};
