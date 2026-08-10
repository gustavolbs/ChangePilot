export type ContextSegment = Readonly<{
  name: string;
  tokenCount: number;
}>;

export type ContextWindowEvaluation =
  | Readonly<{
      status: "fits";
      contextWindowTokens: number;
      inputTokenCount: number;
      outputTokenBudget: number;
      totalRequiredTokens: number;
      remainingTokens: number;
    }>
  | Readonly<{
      status: "exceeds";
      contextWindowTokens: number;
      inputTokenCount: number;
      outputTokenBudget: number;
      totalRequiredTokens: number;
      overflowTokens: number;
    }>;

export const evaluateContextWindow = (
  contextWindowTokens: number,
  segments: readonly ContextSegment[],
  outputTokenBudget: number,
): ContextWindowEvaluation => {
  if (contextWindowTokens <= 0 || !Number.isInteger(contextWindowTokens)) {
    throw new RangeError(
      "Context window tokens cannot be negative, zero, or fractional.",
    );
  }

  if (outputTokenBudget < 0 || !Number.isInteger(outputTokenBudget)) {
    throw new RangeError(
      "Output token budget cannot be negative or fractional.",
    );
  }

  const count = segments.reduce((acc, segment) => {
    if (segment.tokenCount < 0 || !Number.isInteger(segment.tokenCount)) {
      throw new RangeError(
        "Segment token counts cannot be negative or fractional.",
      );
    }
    return acc + segment.tokenCount;
  }, 0);
  const totalRequiredTokens = count + outputTokenBudget;

  const commonProps = {
    contextWindowTokens,
    inputTokenCount: count,
    outputTokenBudget,
    totalRequiredTokens,
  };

  if (totalRequiredTokens <= contextWindowTokens) {
    return {
      status: "fits",
      remainingTokens: contextWindowTokens - totalRequiredTokens,
      ...commonProps,
    };
  }

  return {
    status: "exceeds",
    overflowTokens: totalRequiredTokens - contextWindowTokens,
    ...commonProps,
  };
};
