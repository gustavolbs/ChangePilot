import { describe, expect, it } from "vitest";

import { createReviewProvider } from "./review-provider.js";

describe("createReviewProvider", () => {
  it("creates the fake provider without OpenAI credentials", () => {
    const provider = createReviewProvider({
      AI_PROVIDER: "fake",
    });

    expect(provider.id).toBe("fake");
    expect(provider.pricing).toEqual({
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    });
  });

  it("rejects an unsupported provider", () => {
    expect(() =>
      createReviewProvider({
        AI_PROVIDER: "unsupported",
      }),
    ).toThrow(/AI_PROVIDER.*openai.*fake/i);
  });

  it("requires an API key for the OpenAI provider", () => {
    expect(() =>
      createReviewProvider({
        AI_PROVIDER: "openai",
      }),
    ).toThrow(/OPENAI_API_KEY/);
  });

  it("requires a model for the OpenAI provider", () => {
    expect(() =>
      createReviewProvider({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "test-key",
      }),
    ).toThrow(/OPENAI_MODEL/);
  });
});
