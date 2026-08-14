import { ZodType } from "zod";
import { GenerationRequest, GenerationResponse } from "./generation.js";

export type ToolDefinition<Input> = Readonly<{
  name: string;
  description: string;
  inputSchema: ZodType<Input>;
  execute(input: Input): Promise<string>;
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

export type ToolGenerationRequest<Input> = GenerationRequest &
  Readonly<{
    tools: readonly ToolDefinition<Input>[];
    maxToolRounds: number;
  }>;

export type ToolGenerationResponse = GenerationResponse &
  Readonly<{
    toolExecutions: readonly ToolExecution[];
  }>;

export interface ToolCallingAdapter {
  generateWithTools<Input>(
    request: ToolGenerationRequest<Input>,
  ): Promise<ToolGenerationResponse>;
}

export const defineTool = <Input>(
  definition: ToolDefinition<Input>,
): ToolDefinition<Input> => definition;
