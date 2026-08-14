import { app } from "./index.js";
import { cors } from "hono/cors";
import { createOpenAIStreamingGenerationAdapter } from "@changepilot/ai";
import { streamSSE } from "hono/streaming";
import OpenAI from "openai";

const openAIClient = new OpenAI();

const adapter = createOpenAIStreamingGenerationAdapter({
  model: process.env.OPENAI_MODEL!,
  createStream: (request, signal) =>
    openAIClient.responses.create(request, { signal }),
});

app.use(
  "/reviews/*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  }),
);

app.post("/reviews/stream", async (c) => {
  const body = await c.req.json<{
    changeDescription?: string;
  }>();

  if (!body.changeDescription?.trim()) {
    return c.json({ error: "changeDescription is required." }, 400);
  }

  return streamSSE(c, async (stream) => {
    const providerController = new AbortController();

    stream.onAbort(() => {
      providerController.abort();
    });

    try {
      // DE ONDE VEM ESSA REQUEST?
      for await (const event of adapter.stream(request, {
        signal: providerController.signal,
      })) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });
      }
    } catch (error) {
      if (providerController.signal.aborted) {
        return;
      }

      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          type: "error",
          message:
            error instanceof Error ? error.message : "Unknown streaming error.",
        }),
      });
    }
  });
});
