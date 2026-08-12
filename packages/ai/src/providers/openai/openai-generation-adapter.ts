import type { GenerationAdapter } from "../../generation/generation.js";
import { mapRequest, mapResponse } from "./mappers.js";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses.mjs";
import type { ConversationMessage } from "../../labs/message-sequence.js";

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

export function createOpenAIGenerationAdapter(
  options: OpenAIGenerationAdapterOptions,
): GenerationAdapter {
  validateModel(options.model);

  return {
    async generate(request) {
      validateMessages(request.messages);
      validateStopSequences(request.parameters.stopSequences);

      if (request.parameters.stopSequences.length > 0) {
        throw new RangeError(
          "OpenAI: stopSequences are not supported by this adapter.",
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

const validateModel = (model: string): void => {
  if (!model?.trim()) {
    throw new Error("OpenAI: Model name cannot be empty.");
  }
};

const validateMessages = (messages: readonly ConversationMessage[]): void => {
  if (messages.length < 2) {
    throw new RangeError(
      "OpenAI: Message sequence must contain an instruction and at least one subsequent message.",
    );
  }

  messages.forEach((m) => {
    if (!m.content.trim() || !m.role.trim()) {
      throw new RangeError("OpenAI: message and role cannot be empty");
    }
  });
};

const validateStopSequences = (stopSequences: readonly string[]) => {
  if (!Array.isArray(stopSequences)) {
    throw new RangeError("Stop sequences must be an array.");
  }

  for (const sequence of stopSequences) {
    if (typeof sequence !== "string" || !sequence.trim()) {
      throw new RangeError("Stop sequences must be non-empty strings.");
    }
  }
};
