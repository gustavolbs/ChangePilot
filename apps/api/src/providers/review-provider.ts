import {
  createFakeStreamingGenerationAdapter,
  createOpenAIStreamingGenerationAdapter,
  fakeModelPricing,
  getOpenAIModelPricing,
  type ModelPricing,
  type StreamingGenerationAdapter,
} from "@changepilot/ai";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";

export type ReviewProviderId = "openai" | "fake";

export type ReviewProvider = Readonly<{
  id: ReviewProviderId;
  adapter: StreamingGenerationAdapter;
  pricing: ModelPricing;
}>;

type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

const parseReviewProviderId = (value: string | undefined): ReviewProviderId => {
  if (value === undefined) {
    return "openai";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "openai" || normalized === "fake") {
    return normalized;
  }

  throw new Error('AI_PROVIDER must be either "openai" or "fake".');
};

const getRequiredEnvironmentVariable = (
  environment: EnvironmentVariables,
  name: string,
): string => {
  const value = environment[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
};

const createFakeReviewProvider = (): ReviewProvider => {
  return {
    id: "fake",
    adapter: createFakeStreamingGenerationAdapter({
      model: "fake-review-v1",
      chunks: [
        "Fake review generated locally.\n\n",
        "The provider abstraction and streaming pipeline are working.",
      ],
      createResponseId: () => `fake_${randomUUID()}`,
    }),
    pricing: fakeModelPricing,
  };
};

const createOpenAIReviewProvider = (
  environment: EnvironmentVariables,
): ReviewProvider => {
  const apiKey = getRequiredEnvironmentVariable(environment, "OPENAI_API_KEY");
  const model = getRequiredEnvironmentVariable(environment, "OPENAI_MODEL");

  const client = new OpenAI({
    apiKey,
    maxRetries: 0,
  });

  return {
    id: "openai",
    adapter: createOpenAIStreamingGenerationAdapter({
      model,
      createStream: (request, signal) =>
        client.responses.create(request, { signal }),
    }),
    pricing: getOpenAIModelPricing(model),
  };
};

export const createReviewProvider = (
  environment: EnvironmentVariables,
): ReviewProvider => {
  const providerId = parseReviewProviderId(environment.AI_PROVIDER);

  switch (providerId) {
    case "fake":
      return createFakeReviewProvider();

    case "openai":
      return createOpenAIReviewProvider(environment);
  }
};
