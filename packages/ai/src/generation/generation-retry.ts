import type { GenerationError } from "./generation-error.js";

export type RetryPolicy = Readonly<{
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  maxTotalDelayMs: number;
}>;

export type CalculateRetryDelayInput = Readonly<{
  retryNumber: number;
  retryAfterMs?: number;
  policy: RetryPolicy;
  random: () => number;
}>;

export type ShouldRetryGenerationInput = Readonly<{
  error: GenerationError;
  failedAttempt: number;
  hasEmittedText: boolean;
  policy: RetryPolicy;
  signal?: AbortSignal;
}>;

export type RetrySleeper = (
  delayMs: number,
  signal?: AbortSignal,
) => Promise<void>;

export const defaultGenerationRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  maxTotalDelayMs: 5_000,
} satisfies RetryPolicy;

export const calculateRetryDelayMs = ({
  retryNumber,
  retryAfterMs,
  policy,
  random,
}: CalculateRetryDelayInput): number => {
  if (retryAfterMs !== undefined) {
    return retryAfterMs + Math.floor(random() * policy.baseDelayMs);
  }

  const ceiling = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * 2 ** (retryNumber - 1),
  );

  return Math.floor(random() * ceiling);
};

export const shouldRetryGeneration = ({
  error,
  failedAttempt,
  hasEmittedText,
  policy,
  signal,
}: ShouldRetryGenerationInput): boolean => {
  return (
    error.retryable &&
    !hasEmittedText &&
    !signal?.aborted &&
    failedAttempt < policy.maxAttempts
  );
};

export const parseRetryAfterMs = (
  value: string | undefined,
): number | undefined => {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }

  return Math.ceil(seconds * 1_000);
};

export const sleepForRetry: RetrySleeper = (delayMs, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener("abort", onAbort, {
      once: true,
    });
  });
