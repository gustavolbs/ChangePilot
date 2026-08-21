import type { GenerationParameters } from "./generation-parameters.js";
import type { ConversationMessage } from "./message-sequence.js";

export type TokenUsage = Readonly<{
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}>;

export type FinishReason = "completed" | "max-output-tokens" | "content-filter";

export type GenerationRequest = Readonly<{
  messages: readonly ConversationMessage[];
  parameters: GenerationParameters;
}>;

export type GenerationResponse = Readonly<{
  id: string;
  model: string;
  outputText: string;
  finishReason: FinishReason;
  usage: TokenUsage;
}>;

export interface GenerationAdapter {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}
