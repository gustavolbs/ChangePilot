import {
  createOpenAIStreamingGenerationAdapter,
  getOpenAIModelPricing,
} from "@changepilot/ai";
import { serve } from "@hono/node-server";
import OpenAI from "openai";
import { createApp } from "./routes/index.js";

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
};

const openAIClient = new OpenAI({
  apiKey: getRequiredEnvironmentVariable("OPENAI_API_KEY"),
  maxRetries: 0,
});

const model = getRequiredEnvironmentVariable("OPENAI_MODEL");
const adapter = createOpenAIStreamingGenerationAdapter({
  model,
  createStream: (request, signal) =>
    openAIClient.responses.create(request, { signal }),
});
const pricing = getOpenAIModelPricing(model);
const getGenerationTimeoutMs = (): number => {
  const rawValue = process.env.AI_GENERATION_TIMEOUT_MS;

  if (rawValue === undefined) {
    return 30_000;
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("AI_GENERATION_TIMEOUT_MS must be a positive integer.");
  }

  return value;
};

const app = createApp(adapter, pricing, {
  generationTimeoutMs: getGenerationTimeoutMs(),
});
serve(
  {
    fetch: app.fetch,
    port: process.env.API_PORT ? parseInt(process.env.API_PORT) : 3001,
  },
  (info) => {
    console.log(`API running on http://localhost:${info.port}`);
  },
);
