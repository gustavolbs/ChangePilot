import { GenerationAdapter } from "../../generation/generation.js";
import { OpenAI } from "openai/index.js";
import {
  validateMessages,
  validateModel,
  validateStopSequences,
} from "../validators/index.js";
import { mapRequest, mapResponse } from "./mappers.js";
import { APIPromise } from "openai";

type OpenAIGenerationAdapterOptions = Readonly<{
  model: string;
  createResponse: (
    body: OpenAI.Responses.ResponseCreateParamsNonStreaming,
  ) => APIPromise<OpenAI.Responses.Response>;
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

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });

      const openAIResponse = await options.createResponse(openAIRequest);

      return mapResponse(openAIResponse);
    },
  };
}
