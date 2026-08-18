import { describe, expect, it } from "vitest";

import type { TokenUsage } from "../generation/generation.js";
import {
  calculateGenerationCost,
  createUsageCostRecord,
  type ModelPricing,
} from "./generation-cost.js";

const lunaPricing: ModelPricing = {
  inputUsdPerMillionTokens: 0.2,
  outputUsdPerMillionTokens: 1.2,
};

describe("generation cost", () => {
  it("calculates Luna input, output, and total cost", () => {
    const cost = calculateGenerationCost(
      {
        inputTokens: 2_000,
        outputTokens: 1_000,
        totalTokens: 3_000,
      },
      lunaPricing,
    );

    expect(cost.inputUsd).toBeCloseTo(0.0004);
    expect(cost.outputUsd).toBeCloseTo(0.0012);
    expect(cost.totalUsd).toBeCloseTo(0.0016);
  });

  it("returns zero cost for zero tokens", () => {
    const cost = calculateGenerationCost(
      {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      lunaPricing,
    );

    expect(cost.inputUsd).toBeCloseTo(0);
    expect(cost.outputUsd).toBeCloseTo(0);
    expect(cost.totalUsd).toBeCloseTo(0);
  });

  it("creates a usage cost record without changing generation metadata", () => {
    const usage: TokenUsage = {
      inputTokens: 2_000,
      outputTokens: 1_000,
      totalTokens: 3_000,
    };

    const record = createUsageCostRecord({
      feature: "change-review",
      pricing: lunaPricing,
      response: {
        id: "resp_cost_123",
        model: "gpt-5.6-luna",
        finishReason: "completed",
        usage,
      },
    });

    expect(record).toMatchObject({
      requestId: "resp_cost_123",
      feature: "change-review",
      model: "gpt-5.6-luna",
      finishReason: "completed",
      usage,
    });
    expect(record.usage).toBe(usage);
    expect(record.estimatedCost.inputUsd).toBeCloseTo(0.0004);
    expect(record.estimatedCost.outputUsd).toBeCloseTo(0.0012);
    expect(record.estimatedCost.totalUsd).toBeCloseTo(0.0016);
  });
});
