import type {
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses.mjs";
import { GenerationError } from "../../generation/generation-error.js";
import type { StreamingGenerationAdapter } from "../../generation/streaming-generation.js";
import { mapRequest, mapResponse } from "./mappers.js";
import { validateGenerationRequest, validateModel } from "./validators.js";
import {
  calculateRetryDelayMs,
  defaultGenerationRetryPolicy,
  parseRetryAfterMs,
  shouldRetryGeneration,
  sleepForRetry,
  type RetryPolicy,
  type RetrySleeper,
} from "../../generation/generation-retry.js";

export type OpenAIStreamingGenerationAdapterOptions = Readonly<{
  model: string;
  createStream: (
    request: ResponseCreateParamsStreaming,
    signal?: AbortSignal,
  ) => Promise<AsyncIterable<ResponseStreamEvent>>;
  retryPolicy?: RetryPolicy;
  sleep?: RetrySleeper;
  random?: () => number;
}>;

export function createOpenAIStreamingGenerationAdapter(
  options: OpenAIStreamingGenerationAdapterOptions,
): StreamingGenerationAdapter {
  validateModel(options.model);
  const retryPolicy = options.retryPolicy ?? defaultGenerationRetryPolicy;
  const sleep = options.sleep ?? sleepForRetry;
  const random = options.random ?? Math.random;

  return {
    async *stream(request, streamOptions) {
      validateGenerationRequest(request);

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });
      let failedAttempt = 1;
      let totalDelayMs = 0;
      let hasEmittedText = false;

      while (true) {
        try {
          const openAIStream = await options.createStream(
            {
              ...openAIRequest,
              stream: true,
            },
            streamOptions?.signal,
          );

          let outputText = "";
          for await (const event of openAIStream) {
            if (event.type === "response.output_text.delta") {
              hasEmittedText = true;
              outputText += event.delta;
              yield {
                type: "text-delta",
                delta: event.delta,
              };
            }

            if (
              event.type === "response.completed" ||
              event.type === "response.incomplete"
            ) {
              yield {
                type: "finished",
                response: mapResponse({
                  ...event.response,
                  output_text: outputText,
                }),
              };

              return;
            }

            if (event.type === "response.failed") {
              throw new GenerationError({
                code: "provider-unavailable",
                message:
                  event.response.error?.message ?? "OpenAI response failed.",
                retryable: true,
              });
            }
            if (event.type === "error") {
              throw new GenerationError({
                code: "provider-unavailable",
                message: event.message ?? "An OpenAI error occurred.",
                retryable: true,
              });
            }
          }

          throw new GenerationError({
            code: "provider-unavailable",
            message: "OpenAI stream ended without a terminal response.",
            retryable: true,
          });
        } catch (error: unknown) {
          const generationError = mapOpenAIError(error, streamOptions?.signal);

          const canRetry = shouldRetryGeneration({
            error: generationError,
            failedAttempt,
            hasEmittedText,
            policy: retryPolicy,
            signal: streamOptions?.signal,
          });

          if (!canRetry) {
            throw generationError;
          }

          const delayMs = calculateRetryDelayMs({
            retryNumber: failedAttempt,
            retryAfterMs: generationError.retryAfterMs,
            policy: retryPolicy,
            random,
          });

          if (totalDelayMs + delayMs > retryPolicy.maxTotalDelayMs) {
            throw generationError;
          }

          try {
            await sleep(delayMs, streamOptions?.signal);
          } catch (sleepError) {
            throw mapOpenAIError(sleepError, streamOptions?.signal);
          }

          totalDelayMs += delayMs;
          failedAttempt += 1;
        }
      }
    },
  };
}

const mapOpenAIError = (
  error: unknown,
  signal?: AbortSignal,
): GenerationError => {
  const isAbortError =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError";

  if (signal?.aborted || isAbortError) {
    return new GenerationError({
      code: "cancelled",
      message: error instanceof Error ? error.message : "Generation cancelled.",
      retryable: false,
      cause: error,
    });
  }

  if (error instanceof GenerationError) {
    return error;
  }

  const candidate =
    typeof error === "object" && error !== null
      ? (error as {
          name?: unknown;
          status?: unknown;
          code?: unknown;
          message?: unknown;
        })
      : {};
  const name = typeof candidate.name === "string" ? candidate.name : undefined;
  const status =
    typeof candidate.status === "number" ? candidate.status : undefined;
  const code = typeof candidate.code === "string" ? candidate.code : undefined;
  const message =
    typeof candidate.message === "string"
      ? candidate.message
      : "Unknown OpenAI error.";

  if (status === 408 || name === "APIConnectionTimeoutError") {
    return new GenerationError({
      code: "timeout",
      message,
      retryable: true,
      cause: error,
    });
  }

  if (status !== undefined && [400, 404, 422].includes(status)) {
    return new GenerationError({
      code: "invalid-request",
      message,
      retryable: false,
      cause: error,
    });
  }

  if (status === 401) {
    return new GenerationError({
      code: "authentication",
      message,
      retryable: false,
      cause: error,
    });
  }

  if (status === 403) {
    return new GenerationError({
      code: "permission-denied",
      message,
      retryable: false,
      cause: error,
    });
  }

  if (status === 429) {
    const quotaIndicator = `${name ?? ""} ${code ?? ""}`.toLowerCase();

    if (
      quotaIndicator.includes("quota") ||
      quotaIndicator.includes("credit") ||
      quotaIndicator.includes("spend")
    ) {
      return new GenerationError({
        code: "quota-exceeded",
        message,
        retryable: false,
        cause: error,
      });
    }

    return new GenerationError({
      code: "rate-limit",
      message: "OpenAI rate limit reached.",
      retryable: true,
      retryAfterMs: parseRetryAfterMs(readRetryAfterHeader(error)),
      cause: error,
    });
  }

  if (
    (status !== undefined && (status === 409 || status >= 500)) ||
    name === "APIConnectionError"
  ) {
    return new GenerationError({
      code: "provider-unavailable",
      message,
      retryable: true,
      cause: error,
    });
  }

  return new GenerationError({
    code: "unknown",
    message,
    retryable: false,
    cause: error,
  });
};

const readRetryAfterHeader = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("headers" in error)) {
    return undefined;
  }

  const headers = error.headers;

  if (
    typeof headers === "object" &&
    headers !== null &&
    "get" in headers &&
    typeof headers.get === "function"
  ) {
    const value = (
      headers as {
        get(name: string): unknown;
      }
    ).get("retry-after");

    return typeof value === "string" ? value : undefined;
  }

  if (typeof headers === "object" && headers !== null) {
    const value = (headers as Record<string, unknown>)["retry-after"];

    return typeof value === "string" ? value : undefined;
  }

  return undefined;
};
