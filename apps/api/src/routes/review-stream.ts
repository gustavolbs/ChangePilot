import {
  createGenerationParameters,
  createMessageSequence,
  type ModelPricing,
  type GenerationRequest,
  type StreamingGenerationAdapter,
  createUsageCostRecord,
  type MonotonicClock,
  createGenerationLatencyRecord,
  GenerationError,
  normalizeGenerationError,
  type GenerationErrorCode,
} from "@changepilot/ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

export function createReviewStreamRoutes(
  adapter: StreamingGenerationAdapter,
  pricing: ModelPricing,
  now: MonotonicClock,
  generationTimeoutMs: number,
) {
  const routes = new Hono();

  routes.post("/stream", async (c) => {
    const requestStartedAtMs = now();
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
      const disconnectController = new AbortController();
      const timeoutController = new AbortController();
      const providerSignal = AbortSignal.any([
        disconnectController.signal,
        timeoutController.signal,
      ]);
      const timeoutId = setTimeout(() => {
        timeoutController.abort();
      }, generationTimeoutMs);

      stream.onAbort(() => {
        disconnectController.abort();

        console.info(
          JSON.stringify({
            event: "ai.cancelled",
            feature: "change-review",
          }),
        );
      });

      const providerStartedAtMs = now();
      let firstTokenAtMs: number | null = null;
      let lastTokenAtMs: number | null = null;

      try {
        for await (const event of adapter.stream(request, {
          signal: providerSignal,
        })) {
          const eventReceivedAtMs = now();

          if (event.type === "finished") {
            const usageCostRecord = createUsageCostRecord({
              feature: "change-review",
              pricing,
              response: event.response,
            });
            console.info(
              JSON.stringify({
                event: "ai.usage",
                ...usageCostRecord,
              }),
            );

            const latencyRecord = createGenerationLatencyRecord({
              feature: "change-review",
              response: event.response,
              timestamps: {
                requestStartedAtMs,
                providerStartedAtMs,
                firstTokenAtMs,
                lastTokenAtMs,
                finishedAtMs: eventReceivedAtMs,
              },
            });
            console.info(
              JSON.stringify({
                event: "ai.latency",
                ...latencyRecord,
              }),
            );
          }

          if (event.type === "text-delta") {
            firstTokenAtMs ??= eventReceivedAtMs;
            lastTokenAtMs = eventReceivedAtMs;
          }

          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          });
        }
      } catch (error) {
        if (disconnectController.signal.aborted) {
          return;
        }

        const generationError = timeoutController.signal.aborted
          ? new GenerationError({
              code: "timeout",
              message: "Generation exceeded the application timeout.",
              retryable: true,
              cause: error,
            })
          : normalizeGenerationError(error);

        console.error(
          JSON.stringify({
            event: "ai.error",
            feature: "change-review",
            code: generationError.code,
            retryable: generationError.retryable,
            message: generationError.message,
          }),
        );

        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            type: "error",
            code: generationError.code,
            message: getPublicReviewErrorMessage(generationError.code),
            retryable: generationError.retryable,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });

  return routes;
}

const getPublicReviewErrorMessage = (code: GenerationErrorCode): string => {
  switch (code) {
    case "invalid-request":
      return "The AI request is invalid.";

    case "authentication":
    case "permission-denied":
    case "quota-exceeded":
      return "The AI service is not correctly available.";

    case "rate-limit":
      return "The AI service is busy. Try again shortly.";

    case "provider-unavailable":
      return "The AI provider is temporarily unavailable.";

    case "timeout":
      return "The review took too long and was stopped.";

    case "cancelled":
      return "The review was cancelled.";

    case "unknown":
      return "An unexpected generation error occurred.";
  }
};
