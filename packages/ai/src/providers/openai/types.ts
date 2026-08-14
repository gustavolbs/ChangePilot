import type { GenerationAdapter } from "../../generation/generation.js";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseInput,
} from "openai/resources/responses/responses.mjs";
import {
  StructuredGenerationAdapter,
  StructuredGenerationRequest,
} from "../../generation/structured-generation.js";
import { ToolCallingAdapter } from "../../generation/tool-calling.js";

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

export type OpenAIGenerationAdapterOptions = Readonly<{
  model: string;
  createResponse: (
    request: ResponseCreateParamsNonStreaming,
  ) => Promise<OpenAIResponseSnapshot>;
}>;

export type OpenAIGenerationAdapter = GenerationAdapter &
  StructuredGenerationAdapter &
  ToolCallingAdapter;

export type ZodMapInput<Output> = Readonly<{
  model: string;
  request: StructuredGenerationRequest<Output>;
}>;

export type MappedOpenAIRequest = Omit<
  ResponseCreateParamsNonStreaming,
  "input"
> & {
  input: ResponseInput;
};
