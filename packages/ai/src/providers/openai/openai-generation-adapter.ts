import type {
  GenerationAdapter,
  GenerationRequest,
} from "../../generation/generation.js";
import { mapRequest, mapResponse } from "./mappers.js";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses.mjs";
import type { ConversationMessage } from "../../labs/message-sequence.js";
import {
  StructuredGenerationAdapter,
  StructuredGenerationRequest,
  StructuredGenerationResponse,
} from "../../generation/structured-generation.js";
import { zodTextFormat } from "openai/helpers/zod";

export type OpenAIResponseSnapshot = Pick<
  Response,
  | "id"
  | "model"
  | "status"
  | "output"
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

export type OpenAIGenerationAdapter = GenerationAdapter &
  StructuredGenerationAdapter;

type ZodMapInput<Output> = Readonly<{
  model: string;
  request: StructuredGenerationRequest<Output>;
}>;

export function createOpenAIGenerationAdapter(
  options: OpenAIGenerationAdapterOptions,
): OpenAIGenerationAdapter {
  validateModel(options.model);

  return {
    async generate(request) {
      validateGenerationRequest(request);

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });

      const openAIResponse = await options.createResponse(openAIRequest);

      return mapResponse(openAIResponse);
    },

    async generateStructured<Output>(
      request: StructuredGenerationRequest<Output>,
    ): Promise<StructuredGenerationResponse<Output>> {
      validateGenerationRequest(request);
      validateSchemaName(request.output.schemaName);

      const openAIRequest = zodMapRequest({
        model: options.model,
        request,
      });

      const openAIResponse = await options.createResponse(openAIRequest);

      if (containsRefusal(openAIResponse)) {
        throw new Error("OpenAI: Model refused the structured response.");
      }

      const baseResponse = mapResponse(openAIResponse);

      if (baseResponse.finishReason !== "completed") {
        throw new Error("OpenAI: Response not completed yet.");
      }

      let parsedJson: unknown;

      try {
        parsedJson = JSON.parse(baseResponse.outputText);
      } catch {
        throw new Error("OpenAI: Structured response is not valid JSON.");
      }

      const validation = request.output.schema.safeParse(parsedJson);

      if (!validation.success) {
        throw new Error(
          "OpenAI: Structured response does not match the requested schema.",
        );
      }

      return {
        ...baseResponse,
        finishReason: "completed",
        output: validation.data,
      };
    },
  };
}

const validateGenerationRequest = (request: GenerationRequest): void => {
  validateMessages(request.messages);
  validateStopSequences(request.parameters.stopSequences);

  if (request.parameters.stopSequences.length > 0) {
    throw new RangeError(
      "OpenAI: stopSequences are not supported by this adapter.",
    );
  }
};

const validateModel = (model: string): void => {
  if (!model?.trim()) {
    throw new Error("OpenAI: Model name cannot be empty.");
  }
};

const validateSchemaName = (schemaName: string): void => {
  if (!schemaName.trim()) {
    throw new RangeError("OpenAI: Schema name cannot be empty.");
  }

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(schemaName)) {
    throw new RangeError(
      "OpenAI: Schema name must contain only letters, numbers, underscores, or hyphens and be at most 64 characters.",
    );
  }
};

const containsRefusal = (response: OpenAIResponseSnapshot): boolean =>
  response.output.some(
    (item) =>
      item.type === "message" &&
      item.content.some((content) => content.type === "refusal"),
  );

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

const zodMapRequest = <Output>({
  model,
  request,
}: ZodMapInput<Output>): ResponseCreateParamsNonStreaming => {
  const mappedRequest = mapRequest({
    model,
    request,
  });

  return {
    ...mappedRequest,
    text: {
      format: zodTextFormat(request.output.schema, request.output.schemaName),
    },
  };
};
