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

  it("should throw error when context window is negative", () => {
    expect(() => {
      evaluateContextWindow(
        -1,
        [
          { name: "instructions", tokenCount: 18 },
          { name: "question", tokenCount: 12 },
          { name: "diff", tokenCount: 70 },
        ],
        28,
      );
    }).toThrow(
      "Context window tokens cannot be negative, zero, or fractional.",
    );
  });

  it("should throw error when context window is fractional", () => {
    expect(() => {
      evaluateContextWindow(
        127.5,
        [
          { name: "instructions", tokenCount: 18 },
          { name: "question", tokenCount: 12 },
          { name: "diff", tokenCount: 70 },
        ],
        28,
      );
    }).toThrow(
      "Context window tokens cannot be negative, zero, or fractional.",
    );
  });

  it("should throw error when output token budget is negative", () => {
    expect(() => {
      evaluateContextWindow(
        128,
        [
          { name: "instructions", tokenCount: 18 },
          { name: "question", tokenCount: 12 },
          { name: "diff", tokenCount: 70 },
        ],
        -1,
      );
    }).toThrow("Output token budget cannot be negative or fractional.");
  });

  it("should throw error when output token budget is fractional", () => {
    expect(() => {
      evaluateContextWindow(
        128,
        [
          { name: "instructions", tokenCount: 18 },
          { name: "question", tokenCount: 12 },
          { name: "diff", tokenCount: 70 },
        ],
        28.5,
      );
    }).toThrow("Output token budget cannot be negative or fractional.");
  });

  it("should throw error when segment token count is negative", () => {
    expect(() => {
      evaluateContextWindow(
        128,
        [
          { name: "instructions", tokenCount: 18 },
          { name: "question", tokenCount: -12 },
          { name: "diff", tokenCount: 70 },
        ],
        28,
      );
    }).toThrow("Segment token counts cannot be negative or fractional.");
  });

  it("should throw error when segment token count is fractional", () => {
    expect(() => {
      evaluateContextWindow(
        128,
        [
          { name: "instructions", tokenCount: 18 },
          { name: "question", tokenCount: 12.5 },
          { name: "diff", tokenCount: 70 },
        ],
        28,
      );
    }).toThrow("Segment token counts cannot be negative or fractional.");
  });

  it("should fit when segments array is empty", () => {
    expect(() => {
      evaluateContextWindow(128, [], 28);
    }).not.toThrow();
    expect(evaluateContextWindow(128, [], 28)).toEqual({
      contextWindowTokens: 128,
      inputTokenCount: 0,
      outputTokenBudget: 28,
      remainingTokens: 100,
      status: "fits",
      totalRequiredTokens: 28,
    });
  });
});
