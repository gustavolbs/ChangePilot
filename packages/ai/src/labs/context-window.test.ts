import { describe, expect, it } from "vitest";
import { evaluateContextWindow } from "./context-window.js";

describe("ContextWindow", () => {
  it("should evaluate the context window", () => {
    const result = evaluateContextWindow(
      128,
      [
        { name: "instructions", tokenCount: 18 },
        { name: "question", tokenCount: 12 },
        { name: "diff", tokenCount: 70 },
      ],
      20,
    );

    expect(result).toEqual({
      status: "fits",
      contextWindowTokens: 128,
      inputTokenCount: 100,
      outputTokenBudget: 20,
      totalRequiredTokens: 120,
      remainingTokens: 8,
    });
  });

  it("should fit the context window", () => {
    const result = evaluateContextWindow(
      128,
      [
        { name: "instructions", tokenCount: 18 },
        { name: "question", tokenCount: 12 },
        { name: "diff", tokenCount: 70 },
      ],
      28,
    );

    expect(result).toEqual({
      status: "fits",
      contextWindowTokens: 128,
      inputTokenCount: 100,
      outputTokenBudget: 28,
      totalRequiredTokens: 128,
      remainingTokens: 0,
    });
  });

  it("should exceed the context window", () => {
    const result = evaluateContextWindow(
      127,
      [
        { name: "instructions", tokenCount: 18 },
        { name: "question", tokenCount: 12 },
        { name: "diff", tokenCount: 70 },
      ],
      28,
    );

    expect(result).toEqual({
      status: "exceeds",
      contextWindowTokens: 127,
      inputTokenCount: 100,
      outputTokenBudget: 28,
      totalRequiredTokens: 128,
      overflowTokens: 1,
    });
  });

  it("should exceed when context window is negative", () => {
    const result = evaluateContextWindow(
      -1,
      [
        { name: "instructions", tokenCount: 18 },
        { name: "question", tokenCount: 12 },
        { name: "diff", tokenCount: 70 },
      ],
      28,
    );

    expect(result).toEqual({
      status: "exceeds",
      contextWindowTokens: 0,
      inputTokenCount: 100,
      outputTokenBudget: 28,
      totalRequiredTokens: 128,
      overflowTokens: 128,
    });
  });

  it("should use int when context window is fractional", () => {
    const result = evaluateContextWindow(
      127.5,
      [
        { name: "instructions", tokenCount: 18 },
        { name: "question", tokenCount: 12 },
        { name: "diff", tokenCount: 70 },
      ],
      28,
    );

    expect(result).toEqual({
      status: "exceeds",
      contextWindowTokens: 127,
      inputTokenCount: 100,
      outputTokenBudget: 28,
      totalRequiredTokens: 128,
      overflowTokens: 1,
    });
  });
});
