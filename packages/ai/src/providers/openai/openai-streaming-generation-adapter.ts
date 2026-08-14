import { OpenAIStreamingGenerationAdapterOptions, StreamingGenerationAdapter } from "../../generation/streaming-generation.js";
import { mapRequest } from "./mappers.js";
import { validateGenerationRequest, validateModel } from "./validators.js";

export function createOpenAIStreamingGenerationAdapter(
  options: OpenAIStreamingGenerationAdapterOptions,
): StreamingGenerationAdapter {
  validateModel(options.model);

  return {
    async stream(request) {
      validateGenerationRequest(request);

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });

      const openAIStream = await options.createStream({...openAIRequest, stream: true});

      // N ENTENDI COMO FAZER ISSO AQUI
      for await (const event of openAIStream) {
        if (event.type === "response.output_text.delta") {
          yield {
            type: "text-delta",
            delta: event.delta,
          };
        }

        if (event.type === "response.completed") {
          yield {
            type: "finished",
            response: mapResponse(event.response),
          };

          return;
        }
      }
      return mapResponse(openAIStream);
    },
  };
}
