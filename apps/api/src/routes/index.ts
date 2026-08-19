import type {
  ModelPricing,
  MonotonicClock,
  StreamingGenerationAdapter,
} from "@changepilot/ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createReviewStreamRoutes } from "./review-stream.js";

type CreateAppOptions = Readonly<{
  now?: MonotonicClock;
  generationTimeoutMs?: number;
}>;

export function createApp(
  adapter: StreamingGenerationAdapter,
  pricing: ModelPricing,
  options: CreateAppOptions = {},
) {
  const now = options.now ?? (() => performance.now());
  const generationTimeoutMs = options.generationTimeoutMs ?? 30_000;
  const app = new Hono();

  app.get("/", (c) => c.text("Hello Hono!"));

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: "changepilot-api",
    }),
  );

  app.use(
    "/reviews/*",
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    }),
  );

  app.route(
    "/reviews",
    createReviewStreamRoutes(adapter, pricing, now, generationTimeoutMs),
  );

  return app;
}
