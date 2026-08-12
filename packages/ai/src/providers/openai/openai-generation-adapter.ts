import { GenerationAdapter } from "../../generation/generation.js";
import {
  validateMessages,
  validateModel,
  validateStopSequences,
} from "./validators.js";
import { mapRequest, mapResponse } from "./mappers.js";
import {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses.mjs";

export type OpenAIResponseSnapshot = Pick<
  Response,
  | "id"
  | "model"
  | "status"
  | "output_text"
  | "usage"
  | "incomplete_details"
  | "error"
>;

type OpenAIGenerationAdapterOptions = Readonly<{
  model: string;
  createResponse: (
    request: ResponseCreateParamsNonStreaming,
  ) => Promise<OpenAIResponseSnapshot>;
}>;

const PROVIDER = "OpenAI";

export function createOpenAIGenerationAdapter(
  options: OpenAIGenerationAdapterOptions,
): GenerationAdapter {
  validateModel(options.model, PROVIDER);

  return {
    async generate(request) {
      validateMessages(request.messages, PROVIDER);
      validateStopSequences(request.parameters.stopSequences);

      if (request.parameters.stopSequences.length > 0) {
        throw new RangeError(
          `${PROVIDER}: stopSequences are not supported by this adapter.`,
        );
      }

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });

      const openAIResponse = await options.createResponse(openAIRequest);

      return mapResponse(openAIResponse);
    },
  };
}
