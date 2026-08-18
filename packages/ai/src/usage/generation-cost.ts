import type {
  FinishReason,
  GenerationResponse,
  TokenUsage,
} from "../generation/generation.js";

export type ModelPricing = Readonly<{
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}>;

export type GenerationCost = Readonly<{
  inputUsd: number;
  outputUsd: number;
  totalUsd: number;
}>;

export type AiFeature = "change-review";

export type UsageCostRecord = Readonly<{
  requestId: string;
  feature: AiFeature;
  model: string;
  finishReason: FinishReason;
  usage: TokenUsage;
  estimatedCost: GenerationCost;
}>;

export type CreateUsageCostRecordInput = Readonly<{
  feature: AiFeature;
  response: Pick<GenerationResponse, "id" | "model" | "finishReason" | "usage">;
  pricing: ModelPricing;
}>;

const ONE_MILLION = 1_000_000;

export const calculateGenerationCost = (
  usage: TokenUsage,
  pricing: ModelPricing,
): GenerationCost => {
  const inputCost = calcCost(
    usage.inputTokens,
    pricing.inputUsdPerMillionTokens,
  );
  const outputCost = calcCost(
    usage.outputTokens,
    pricing.outputUsdPerMillionTokens,
  );
  return {
    inputUsd: inputCost,
    outputUsd: outputCost,
    totalUsd: inputCost + outputCost,
  };
};

const calcCost = (field: number, cost: number) => (field / ONE_MILLION) * cost;

export const createUsageCostRecord = (
  input: CreateUsageCostRecordInput,
): UsageCostRecord => {
  const cost = calculateGenerationCost(input.response.usage, input.pricing);
  return {
    requestId: input.response.id,
    feature: input.feature,
    model: input.response.model,
    finishReason: input.response.finishReason,
    usage: input.response.usage,
    estimatedCost: cost,
  };
};
