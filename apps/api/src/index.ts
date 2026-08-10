import { serve } from "@hono/node-server";
import "dotenv/config";
import { app } from "./routes/index.js";

serve(
  {
    fetch: app.fetch,
    port: process.env.API_PORT ? parseInt(process.env.API_PORT) : 3001,
  },
  (info) => {
    console.log(`API running on http://localhost:${info.port}`);
  },
);
