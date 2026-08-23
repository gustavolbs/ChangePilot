import type { EmbeddingVector } from "../embeddings/embedding-vector.js";
import { calculateCosineSimilarity } from "../similarity/vector-similarity.js";

export type VectorSearchCandidate = Readonly<{
  id: string;
  embedding: EmbeddingVector;
}>;

export type VectorSearchResult = Readonly<{
  id: string;
  similarity: number;
}>;

export const searchByVectorSimilarity = (
  query: EmbeddingVector,
  candidates: readonly VectorSearchCandidate[],
): readonly VectorSearchResult[] => {
  return candidates
    .map((candidate, originalIndex) => ({
      id: candidate.id,
      originalIndex,
      similarity: calculateCosineSimilarity(query, candidate.embedding),
    }))
    .sort(
      (resultA, resultB) =>
        resultB.similarity - resultA.similarity ||
        resultA.originalIndex - resultB.originalIndex,
    )
    .map(({ id, similarity }) => ({ id, similarity }));
};
