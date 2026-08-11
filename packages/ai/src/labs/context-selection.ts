export type ContextCandidate = Readonly<{
  id: string;
  content: string;
  tokenCount: number;
  relevanceScore: number;
}>;

export type ContextSelectionOptions = Readonly<{
  tokenBudget: number;
  minimumRelevanceScore: number;
}>;

export type ContextCandidateExclusion = Readonly<{
  candidate: ContextCandidate;
  reason: "below-relevance-threshold" | "token-budget";
}>;

export type ContextSelection = Readonly<{
  tokenBudget: number;
  minimumRelevanceScore: number;
  selectedCandidates: readonly ContextCandidate[];
  excludedCandidates: readonly ContextCandidateExclusion[];
  selectedTokenCount: number;
  remainingTokens: number;
}>;

export const selectContextCandidates = (
  candidates: readonly ContextCandidate[],
  options: ContextSelectionOptions,
): ContextSelection => {
  validateCandidates(candidates);
  validateOptions(options);

  const selectedCandidates: ContextCandidate[] = [];
  const excludedCandidates: ContextCandidateExclusion[] = [];
  let selectedTokenCount = 0;

  const descSorted: ContextCandidate[] = [...candidates].sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );

  descSorted.forEach((candidate) => {
    if (candidate.relevanceScore < options.minimumRelevanceScore) {
      excludedCandidates.push({
        candidate,
        reason: "below-relevance-threshold",
      });
    } else if (
      selectedTokenCount + candidate.tokenCount <=
      options.tokenBudget
    ) {
      selectedCandidates.push(candidate);
      selectedTokenCount += candidate.tokenCount;
    } else {
      excludedCandidates.push({
        candidate,
        reason: "token-budget",
      });
    }
  });

  return {
    excludedCandidates,
    minimumRelevanceScore: options.minimumRelevanceScore,
    remainingTokens: options.tokenBudget - selectedTokenCount,
    selectedCandidates,
    selectedTokenCount,
    tokenBudget: options.tokenBudget,
  };
};

const validateCandidates = (candidates: readonly ContextCandidate[]) => {
  for (const candidate of candidates) {
    if (candidate.tokenCount < 0 || !Number.isInteger(candidate.tokenCount)) {
      throw new RangeError(
        "Candidate tokenCount must be a non-negative finite integer.",
      );
    }

    if (
      candidate.relevanceScore < 0 ||
      candidate.relevanceScore > 100 ||
      !Number.isInteger(candidate.relevanceScore)
    ) {
      throw new RangeError(
        "Candidate relevanceScore must be an integer between 0 and 100.",
      );
    }

    if (!candidate.content.trim()) {
      throw new RangeError("Candidate content must be a non-empty string.");
    }

    if (!candidate.id.trim()) {
      throw new RangeError("Candidate id must be a non-empty string.");
    }
  }
};

const validateOptions = (options: ContextSelectionOptions) => {
  if (options.tokenBudget < 0 || !Number.isInteger(options.tokenBudget)) {
    throw new RangeError("tokenBudget must be a non-negative finite integer.");
  }

  if (
    options.minimumRelevanceScore < 0 ||
    options.minimumRelevanceScore > 100 ||
    !Number.isInteger(options.minimumRelevanceScore)
  ) {
    throw new RangeError(
      "minimumRelevanceScore must be an integer between 0 and 100.",
    );
  }
};
