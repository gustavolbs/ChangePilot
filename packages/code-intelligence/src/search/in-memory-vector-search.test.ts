import { describe, expect, it } from "vitest";

import { createEmbeddingVector } from "../embeddings/embedding-vector.js";
import {
  searchByVectorSimilarity,
  type VectorSearchCandidate,
} from "./in-memory-vector-search.js";

const vector = (values: readonly number[]) => createEmbeddingVector(values);

const createDirectionalCandidates = (): readonly VectorSearchCandidate[] => [
  {
    id: "orthogonal",
    embedding: vector([0, 1]),
  },
  {
    id: "opposite",
    embedding: vector([-1, 0]),
  },
  {
    id: "near",
    embedding: vector([1, 1]),
  },
  {
    id: "exact",
    embedding: vector([1, 0]),
  },
];

describe("searchByVectorSimilarity", () => {
  it("ranks every candidate by descending cosine similarity", () => {
    const results = searchByVectorSimilarity(
      vector([1, 0]),
      createDirectionalCandidates(),
    );

    expect(results.map((result) => result.id)).toEqual([
      "exact",
      "near",
      "orthogonal",
      "opposite",
    ]);
    expect(results).toHaveLength(4);
  });

  it("returns the expected exact, orthogonal, and opposite scores", () => {
    const results = searchByVectorSimilarity(
      vector([1, 0]),
      createDirectionalCandidates(),
    );
    const scores = new Map(
      results.map((result) => [result.id, result.similarity]),
    );

    expect(scores.get("exact")).toBeCloseTo(1);
    expect(scores.get("orthogonal")).toBeCloseTo(0);
    expect(scores.get("opposite")).toBeCloseTo(-1);
  });

  it("returns an empty result for an empty candidate list", () => {
    expect(searchByVectorSimilarity(vector([1, 0]), [])).toEqual([]);
  });

  it("preserves candidate order when similarity scores are equal", () => {
    const candidates: readonly VectorSearchCandidate[] = [
      {
        id: "first",
        embedding: vector([1, 1]),
      },
      {
        id: "second",
        embedding: vector([2, 2]),
      },
    ];

    expect(
      searchByVectorSimilarity(vector([1, 0]), candidates).map(
        (result) => result.id,
      ),
    ).toEqual(["first", "second"]);
  });

  it("does not modify candidates or their embeddings", () => {
    const candidates = createDirectionalCandidates();
    const originalCandidates = candidates.map((candidate) => ({
      id: candidate.id,
      embedding: {
        dimensions: candidate.embedding.dimensions,
        values: [...candidate.embedding.values],
      },
    }));

    searchByVectorSimilarity(vector([1, 0]), candidates);

    expect(candidates).toEqual(originalCandidates);
  });

  it("propagates incompatible dimensions", () => {
    const candidates: readonly VectorSearchCandidate[] = [
      {
        id: "three-dimensional",
        embedding: vector([1, 0, 0]),
      },
    ];

    expect(() => searchByVectorSimilarity(vector([1, 0]), candidates)).toThrow(
      RangeError,
    );
  });

  it.each([
    ["query", [0, 0], [1, 0]],
    ["candidate", [1, 0], [0, 0]],
  ] as const)(
    "propagates a zero %s vector",
    (_position, queryValues, candidateValues) => {
      expect(() =>
        searchByVectorSimilarity(vector(queryValues), [
          {
            id: "candidate",
            embedding: vector(candidateValues),
          },
        ]),
      ).toThrow(RangeError);
    },
  );
});
