import { serve } from "@hono/node-server";

import { createReviewProvider } from "./providers/review-provider.js";
import { createApp } from "./routes/index.js";

const reviewProvider = createReviewProvider(process.env);

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

const app = createApp(reviewProvider.adapter, reviewProvider.pricing, {
  generationTimeoutMs: getGenerationTimeoutMs(),
});

serve(
  {
    fetch: app.fetch,
    port: process.env.API_PORT ? parseInt(process.env.API_PORT) : 3001,
  },
  (info) => {
    console.log(
      `API running on http://localhost:${info.port} using "${reviewProvider.id}" as AI provider.`,
    );
  },
);
