import { type ModelPricing } from "../../usage/generation-cost.js";

const openAIModelPricing = {
  "gpt-5.6-luna": {
    inputUsdPerMillionTokens: 0.2,
    outputUsdPerMillionTokens: 1.2,
  },
  "gpt-5.6-terra": {
    inputUsdPerMillionTokens: 2,
    outputUsdPerMillionTokens: 12,
  },
  "gpt-5.6-sol": {
    inputUsdPerMillionTokens: 5,
    outputUsdPerMillionTokens: 30,
  },
} satisfies Record<string, ModelPricing>;

type OpenAIModel = keyof typeof openAIModelPricing;

const isOpenAIModel = (model: string): model is OpenAIModel => {
  return model in openAIModelPricing;
};

export const getOpenAIModelPricing = (model: string): ModelPricing => {
  if (!isOpenAIModel(model)) {
    throw new Error(`OpenAI pricing is not configured for model: ${model}.`);
  }

  return openAIModelPricing[model];
};
