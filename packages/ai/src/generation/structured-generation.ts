import type { ZodType } from "zod";

import type { GenerationRequest, GenerationResponse } from "./generation.js";

export type StructuredOutputDefinition<Output> = Readonly<{
  schemaName: string;
  schema: ZodType<Output>;
}>;

export type StructuredGenerationRequest<Output> = GenerationRequest &
  Readonly<{
    output: StructuredOutputDefinition<Output>;
  }>;

export type StructuredGenerationResponse<Output> = Omit<
  GenerationResponse,
  "finishReason"
> &
  Readonly<{
    finishReason: "completed";
    output: Output;
  }>;

export interface StructuredGenerationAdapter {
  generateStructured<Output>(
    request: StructuredGenerationRequest<Output>,
  ): Promise<StructuredGenerationResponse<Output>>;
}
