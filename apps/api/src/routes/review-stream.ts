import {
  createGenerationParameters,
  createMessageSequence,
  type GenerationRequest,
  type StreamingGenerationAdapter,
} from "@changepilot/ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

export function createReviewStreamRoutes(adapter: StreamingGenerationAdapter) {
  const routes = new Hono();

  routes.post("/stream", async (c) => {
    const body: unknown = await c.req.json().catch(() => undefined);

    if (
      typeof body !== "object" ||
      body === null ||
      !("changeDescription" in body) ||
      typeof body.changeDescription !== "string" ||
      !body.changeDescription.trim()
    ) {
      return c.json({ error: "changeDescription is required." }, 400);
    }

    const changeDescription = body.changeDescription.trim();
    const request = {
      messages: createMessageSequence(
        [
          "You are ChangePilot.",
          "Review only the supplied change description.",
          "Do not invent facts that are not present.",
        ].join(" "),
        [],
        `Review this change:\n${changeDescription}`,
      ),
      parameters: createGenerationParameters({
        sampling: {
          strategy: "temperature",
          temperature: 0,
        },
        maxOutputTokens: 1_200,
        stopSequences: [],
      }),
    } satisfies GenerationRequest;

    return streamSSE(c, async (stream) => {
      const providerController = new AbortController();

      stream.onAbort(() => {
        providerController.abort();
      });

      try {
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
              error instanceof Error
                ? error.message
                : "Unknown streaming error.",
          }),
        });
      }
    });
  });

  return routes;
}
