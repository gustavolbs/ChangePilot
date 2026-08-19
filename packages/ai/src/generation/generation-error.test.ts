import { describe, expect, it } from "vitest";

import {
  GenerationError,
  normalizeGenerationError,
} from "./generation-error.js";

describe("generation error", () => {
  it("preserves code, message, and retryable", () => {
    const error = new GenerationError({
      code: "provider-unavailable",
      message: "The provider is unavailable.",
      retryable: true,
    });

    expect(error).toMatchObject({
      code: "provider-unavailable",
      message: "The provider is unavailable.",
      retryable: true,
    });
  });

  it("does not change an existing GenerationError", () => {
    const error = new GenerationError({
      code: "rate-limit",
      message: "Too many requests.",
      retryable: true,
    });

    expect(normalizeGenerationError(error)).toBe(error);
  });

  it("normalizes an unknown error as non-retryable", () => {
    expect(normalizeGenerationError("Unexpected failure.")).toMatchObject({
      code: "unknown",
      message: "Unknown generation error.",
      retryable: false,
    });
  });
});
