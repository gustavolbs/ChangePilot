import type { StreamingGenerationAdapter } from "@changepilot/ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createReviewStreamRoutes } from "./review-stream.js";

export function createApp(adapter: StreamingGenerationAdapter) {
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

  app.route("/reviews", createReviewStreamRoutes(adapter));

  return app;
}
