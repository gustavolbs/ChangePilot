import type {
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses.mjs";
import type { StreamingGenerationAdapter } from "../../generation/streaming-generation.js";
import { mapRequest, mapResponse } from "./mappers.js";
import { validateGenerationRequest, validateModel } from "./validators.js";

export type OpenAIStreamingGenerationAdapterOptions = Readonly<{
  model: string;
  createStream: (
    request: ResponseCreateParamsStreaming,
  ) => Promise<AsyncIterable<ResponseStreamEvent>>;
}>;

export function createOpenAIStreamingGenerationAdapter(
  options: OpenAIStreamingGenerationAdapterOptions,
): StreamingGenerationAdapter {
  validateModel(options.model);

  return {
    async *stream(request) {
      validateGenerationRequest(request);

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });

      const openAIStream = await options.createStream({
        ...openAIRequest,
        stream: true,
      });

      let outputText = "";
      for await (const event of openAIStream) {
        if (event.type === "response.output_text.delta") {
          outputText += event.delta;
          yield {
            type: "text-delta",
            delta: event.delta,
          };
        }

        if (event.type === "response.completed") {
          yield {
            type: "finished",
            response: mapResponse({
              ...event.response,
              output_text: outputText,
            }),
          };

          return;
        }

        if (event.type === "response.failed") {
          throw new Error(event.response.error?.message ?? "unknown error");
        }
        if (event.type === "error") {
          throw new Error(
            `OpenAI: an error occurred while streaming: ${event.message}`,
          );
        }
      }

      throw new Error("OpenAI: stream ended without response.completed.");
    },
  };
}
