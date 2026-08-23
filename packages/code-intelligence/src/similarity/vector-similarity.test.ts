import { describe, expect, it } from "vitest";

import { createEmbeddingVector } from "../embeddings/embedding-vector.js";
import {
  calculateCosineSimilarity,
  calculateDotProduct,
  calculateEuclideanDistance,
} from "./vector-similarity.js";

const vector = (values: readonly number[]) => createEmbeddingVector(values);

describe("vector similarity", () => {
  it("calculates a known dot product using every component", () => {
    expect(calculateDotProduct(vector([1, 2, 3]), vector([4, -5, 6]))).toBe(12);
  });

  it("returns zero for the dot product of orthogonal vectors", () => {
    expect(calculateDotProduct(vector([1, 0]), vector([0, 1]))).toBe(0);
  });

  it("accepts a zero vector in dot product", () => {
    expect(calculateDotProduct(vector([0, 0]), vector([3, 4]))).toBe(0);
  });

  it("allows a negative dot product", () => {
    expect(calculateDotProduct(vector([1, 0]), vector([-1, 0]))).toBe(-1);
  });

  it("calculates a known Euclidean distance", () => {
    expect(
      calculateEuclideanDistance(vector([0, 0]), vector([3, 4])),
    ).toBeCloseTo(5);
  });

  it("returns zero distance for identical vectors", () => {
    expect(
      calculateEuclideanDistance(vector([0.25, -0.5]), vector([0.25, -0.5])),
    ).toBe(0);
  });

  it("returns cosine similarity near one for vectors in the same direction", () => {
    expect(
      calculateCosineSimilarity(vector([1, 2]), vector([2, 4])),
    ).toBeCloseTo(1);
  });

  it("returns cosine similarity near zero for orthogonal vectors", () => {
    expect(
      calculateCosineSimilarity(vector([1, 0]), vector([0, 1])),
    ).toBeCloseTo(0);
  });

  it("returns cosine similarity near negative one for opposite vectors", () => {
    expect(
      calculateCosineSimilarity(vector([1, 0]), vector([-1, 0])),
    ).toBeCloseTo(-1);
  });

  it.each([
    ["dot product", calculateDotProduct],
    ["Euclidean distance", calculateEuclideanDistance],
    ["cosine similarity", calculateCosineSimilarity],
  ])("rejects incompatible dimensions for %s", (_name, operation) => {
    expect(() => operation(vector([1, 2]), vector([1, 2, 3]))).toThrow(
      RangeError,
    );
  });

  it.each([
    ["first", [0, 0], [1, 0]],
    ["second", [1, 0], [0, 0]],
  ] as const)(
    "rejects cosine similarity when the %s vector has zero magnitude",
    (_position, valuesA, valuesB) => {
      expect(() =>
        calculateCosineSimilarity(vector(valuesA), vector(valuesB)),
      ).toThrow(RangeError);
    },
  );

  it("does not modify either input vector", () => {
    const vectorA = vector([1, 2, 3]);
    const vectorB = vector([4, -5, 6]);
    const originalA = [...vectorA.values];
    const originalB = [...vectorB.values];

    calculateDotProduct(vectorA, vectorB);
    calculateEuclideanDistance(vectorA, vectorB);
    calculateCosineSimilarity(vectorA, vectorB);

    expect(vectorA.values).toEqual(originalA);
    expect(vectorB.values).toEqual(originalB);
  });
});
