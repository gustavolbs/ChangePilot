import type { EmbeddingVector } from "../embeddings/embedding-vector.js";

const assertSameDimensions = (
  vectorA: EmbeddingVector,
  vectorB: EmbeddingVector,
): void => {
  if (vectorA.dimensions !== vectorB.dimensions) {
    throw new RangeError("Vectors must have the same dimensionality.");
  }
};

const calculateMagnitude = (vector: EmbeddingVector): number => {
  let squaredComponentsSum = 0;

  for (const component of vector.values) {
    squaredComponentsSum += component ** 2;
  }

  return Math.sqrt(squaredComponentsSum);
};

export const calculateDotProduct = (
  vectorA: EmbeddingVector,
  vectorB: EmbeddingVector,
): number => {
  assertSameDimensions(vectorA, vectorB);

  let productSum = 0;

  for (let index = 0; index < vectorA.values.length; index += 1) {
    productSum += vectorA.values[index]! * vectorB.values[index]!;
  }

  return productSum;
};

export const calculateEuclideanDistance = (
  vectorA: EmbeddingVector,
  vectorB: EmbeddingVector,
): number => {
  assertSameDimensions(vectorA, vectorB);

  let squaredDifferencesSum = 0;

  for (let index = 0; index < vectorA.values.length; index += 1) {
    squaredDifferencesSum +=
      (vectorA.values[index]! - vectorB.values[index]!) ** 2;
  }

  return Math.sqrt(squaredDifferencesSum);
};

export const calculateCosineSimilarity = (
  vectorA: EmbeddingVector,
  vectorB: EmbeddingVector,
): number => {
  assertSameDimensions(vectorA, vectorB);
  const magnitudeA = calculateMagnitude(vectorA);
  const magnitudeB = calculateMagnitude(vectorB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new RangeError("Cosine similarity requires non-zero vectors.");
  }

  return calculateDotProduct(vectorA, vectorB) / (magnitudeA * magnitudeB);
};
