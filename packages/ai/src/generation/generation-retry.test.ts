import { describe, expect, it } from "vitest";

import { GenerationError } from "./generation-error.js";
import {
  calculateRetryDelayMs,
  parseRetryAfterMs,
  shouldRetryGeneration,
  type RetryPolicy,
} from "./generation-retry.js";

const policy: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 1_000,
  maxTotalDelayMs: 5_000,
};

const random = () => 0.5;

const retryableError = new GenerationError({
  code: "provider-unavailable",
  message: "The provider is unavailable.",
  retryable: true,
});

describe("generation retry", () => {
  it("increases the exponential backoff ceiling", () => {
    const delays = [1, 2, 3].map((retryNumber) =>
      calculateRetryDelayMs({
        retryNumber,
        policy,
        random,
      }),
    );

    expect(delays).toEqual([50, 100, 200]);
  });

  it("limits exponential backoff growth to maxDelayMs", () => {
    expect(
      calculateRetryDelayMs({
        retryNumber: 10,
        policy: {
          ...policy,
          maxDelayMs: 400,
        },
        random,
      }),
    ).toBe(200);
  });

  it("uses Retry-After as the minimum delay", () => {
    expect(
      calculateRetryDelayMs({
        retryNumber: 1,
        retryAfterMs: 2_000,
        policy,
        random,
      }),
    ).toBeGreaterThanOrEqual(2_000);
  });

  it('parses Retry-After "2" as 2000 milliseconds', () => {
    expect(parseRetryAfterMs("2")).toBe(2_000);
  });

  it.each([undefined, "", "invalid", "-1"])(
    "returns undefined for an absent or invalid Retry-After value: %s",
    (value) => {
      expect(parseRetryAfterMs(value)).toBeUndefined();
    },
  );

  it("does not retry a non-retryable error", () => {
    expect(
      shouldRetryGeneration({
        error: new GenerationError({
          code: "authentication",
          message: "Invalid API key.",
          retryable: false,
        }),
        failedAttempt: 1,
        hasEmittedText: false,
        policy,
      }),
    ).toBe(false);
  });

  it("does not retry after text was emitted", () => {
    expect(
      shouldRetryGeneration({
        error: retryableError,
        failedAttempt: 1,
        hasEmittedText: true,
        policy,
      }),
    ).toBe(false);
  });

  it("does not retry after cancellation", () => {
    const controller = new AbortController();
    controller.abort();

    expect(
      shouldRetryGeneration({
        error: retryableError,
        failedAttempt: 1,
        hasEmittedText: false,
        policy,
        signal: controller.signal,
      }),
    ).toBe(false);
  });

  it("does not exceed maxAttempts", () => {
    expect(
      shouldRetryGeneration({
        error: retryableError,
        failedAttempt: policy.maxAttempts,
        hasEmittedText: false,
        policy,
      }),
    ).toBe(false);
  });
});
