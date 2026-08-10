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
  contextWindowTokens = Math.trunc(Math.max(0, contextWindowTokens));
  outputTokenBudget = Math.trunc(Math.max(0, outputTokenBudget));

  const count = segments.reduce((acc, segment) => acc + segment.tokenCount, 0);
  const totalRequiredTokens = count + outputTokenBudget || 0;

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
