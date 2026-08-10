import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "dotenv/config";

export const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "changepilot-api",
  });
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
