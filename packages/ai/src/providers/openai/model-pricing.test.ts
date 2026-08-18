import { describe, expect, it } from "vitest";

import { getOpenAIModelPricing } from "./model-pricing.js";

describe("getOpenAIModelPricing", () => {
  it("returns Luna pricing", () => {
    expect(getOpenAIModelPricing("gpt-5.6-luna")).toEqual({
      inputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 1.2,
    });
  });

  it.each([
    ["gpt-5.6-terra", 2, 12],
    ["gpt-5.6-sol", 5, 30],
  ] as const)(
    "returns %s pricing",
    (model, inputUsdPerMillionTokens, outputUsdPerMillionTokens) => {
      expect(getOpenAIModelPricing(model)).toEqual({
        inputUsdPerMillionTokens,
        outputUsdPerMillionTokens,
      });
    },
  );

  it("rejects a model without configured pricing", () => {
    expect(() => getOpenAIModelPricing("gpt-unknown")).toThrow(
      "OpenAI pricing is not configured for model: gpt-unknown.",
    );
  });
});
