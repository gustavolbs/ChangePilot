import z, { ZodType } from "zod";
import { GenerationRequest, GenerationResponse } from "./generation.js";

type ToolDraft<Schema extends ZodType> = Readonly<{
  name: string;
  description: string;
  inputSchema: Schema;
  execute(input: z.output<Schema>): Promise<string>;
}>;

export type ToolDefinition = Readonly<{
  name: string;
  description: string;
  inputSchema: ZodType;
  execute(input: unknown): Promise<string>;
}>;

export type ToolCall = Readonly<{
  callId: string;
  name: string;
  input: unknown;
}>;

export type ToolResultMessage = Readonly<{
  type: "tool-result";
  callId: string;
  output: string;
}>;

export type ToolExecution = Readonly<{
  call: ToolCall;
  result: ToolResultMessage;
}>;

export type ToolGenerationRequest = GenerationRequest &
  Readonly<{
    tools: readonly ToolDefinition[];
    maxToolRounds: number;
  }>;

export type ToolGenerationResponse = GenerationResponse &
  Readonly<{
    toolExecutions: readonly ToolExecution[];
  }>;

export interface ToolCallingAdapter {
  generateWithTools(
    request: ToolGenerationRequest,
  ): Promise<ToolGenerationResponse>;
}

export const defineTool = <Schema extends ZodType>(
  definition: ToolDraft<Schema>,
): ToolDefinition => {
  return {
    ...definition,
    execute(input) {
      const validation = definition.inputSchema.safeParse(input);

      if (!validation.success) {
        throw new Error(`Tool "${definition.name}" received invalid input.`);
      }

      return definition.execute(validation.data);
    },
  };
};
