import type {
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses.mjs";
import type { StreamingGenerationAdapter } from "../../generation/streaming-generation.js";
import { mapRequest, mapResponse } from "./mappers.js";
import { validateGenerationRequest, validateModel } from "./validators.js";
import { GenerationError } from "../../generation/generation-error.js";

export type OpenAIStreamingGenerationAdapterOptions = Readonly<{
  model: string;
  createStream: (
    request: ResponseCreateParamsStreaming,
    signal?: AbortSignal,
  ) => Promise<AsyncIterable<ResponseStreamEvent>>;
}>;

export function createOpenAIStreamingGenerationAdapter(
  options: OpenAIStreamingGenerationAdapterOptions,
): StreamingGenerationAdapter {
  validateModel(options.model);

  return {
    async *stream(request, streamOptions) {
      validateGenerationRequest(request);

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });

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
              message: event.message ?? `OpenAI an error occurred`,
              retryable: true,
            });
          }
        }
      } catch (error: unknown) {
        throw mapOpenAIError(error, streamOptions?.signal);
      }
    },
  };
}

const mapOpenAIError = (
  error: unknown,
  signal?: AbortSignal,
): GenerationError => {
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
  const message =
    typeof candidate.message === "string"
      ? candidate.message
      : "Unknown OpenAI error.";
  const unknownError: GenerationError = {
    code: "unknown",
    message,
    name: name ?? "UnknownError",
    retryable: false,
    cause: "UnknownError.",
    stack: undefined,
  };

  /**
   * ERROR DETECTION STARTS HERE
   */
  if (candidate) {
    if (signal !== undefined) {
      return {
        code: "cancelled",
        message,
        name: name ?? "AbortError",
        retryable: false,
        cause: "Aborted signal or AbortError",
        stack: undefined,
      };
    }

    if (status === 408 || candidate.name === "APIConnectionTimeoutError") {
      return {
        code: "timeout",
        message,
        name: name ?? "APIConnectionTimeoutError",
        retryable: true,
        cause: "APIConnectionTimeoutError or HTTP 408 happened.",
        stack: undefined,
      };
    }

    if (status && [400, 404, 422].includes(status)) {
      return {
        code: "invalid-request",
        message,
        name: name ?? "InvalidRequestError",
        retryable: false,
        cause: "HTTP 400, 404 or 422 happened.",
        stack: undefined,
      };
    }

    if (status === 401) {
      return {
        code: "authentication",
        message,
        name: name ?? "AuthenticationError",
        retryable: false,
        cause: "AuthenticationError.",
        stack: undefined,
      };
    }

    if (status === 403) {
      return {
        code: "permission-denied",
        message,
        name: name ?? "PermissionDeniedError",
        retryable: false,
        cause: "PermissionDeniedError.",
        stack: undefined,
      };
    }

    if (status === 429) {
      const lowerName = name?.toLowerCase();
      if (
        lowerName?.includes("quota") ||
        lowerName?.includes("credits") ||
        lowerName?.includes("spend")
      ) {
        return {
          code: "quota-exceeded",
          message,
          name: name ?? "QuotaExceededError",
          retryable: false,
          cause: "QuotaExceededError.",
          stack: undefined,
        };
      }

      return {
        code: "rate-limit",
        message,
        name: name ?? "RateLimitError",
        retryable: true,
        cause: "RateLimitError.",
        stack: undefined,
      };
    }

    if (
      (status && (status === 409 || status >= 500)) ||
      candidate.name === "APIConnectionError"
    ) {
      return {
        code: "provider-unavailable",
        message,
        name: name ?? "ProviderUnavailableError",
        retryable: true,
        cause: "ProviderUnavailableError.",
        stack: undefined,
      };
    }

    return unknownError;
  }

  return unknownError;
};
