export type GenerationErrorCode =
  | "invalid-request"
  | "authentication"
  | "permission-denied"
  | "rate-limit"
  | "quota-exceeded"
  | "provider-unavailable"
  | "timeout"
  | "cancelled"
  | "unknown";

export type GenerationErrorOptions = Readonly<{
  code: GenerationErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  cause?: unknown;
}>;

export class GenerationError extends Error {
  readonly code: GenerationErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;

  constructor(options: GenerationErrorOptions) {
    super(options.message, {
      cause: options.cause,
    });

    this.name = "GenerationError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export const normalizeGenerationError = (error: unknown): GenerationError => {
  if (error instanceof GenerationError) {
    return error;
  }

  return new GenerationError({
    code: "unknown",
    message:
      error instanceof Error ? error.message : "Unknown generation error.",
    retryable: false,
    cause: error,
  });
};
