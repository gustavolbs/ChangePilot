export const searchByLiteralText = (
  query: string,
  candidates: readonly string[],
): readonly string[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const strongCandidates: string[] = [];
  candidates.forEach((element) => {
    const normalized = element.toLowerCase();
    if (normalized.includes(trimmed)) {
      strongCandidates.push(element);
    }
  });

  return strongCandidates;
};
