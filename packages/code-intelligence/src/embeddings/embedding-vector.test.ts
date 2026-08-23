import { describe, expect, it } from "vitest";

import { createEmbeddingVector } from "./embedding-vector.js";

describe("createEmbeddingVector", () => {
  it("creates a valid embedding vector", () => {
    expect(createEmbeddingVector([0.25, -0.5, 0, 0.75])).toEqual({
      values: [0.25, -0.5, 0, 0.75],
      dimensions: 4,
    });
  });

  it("calculates dimensionality from the number of components", () => {
    const vector = createEmbeddingVector([0.25, -0.5, 0, 0.75]);

    expect(vector.dimensions).toBe(4);
  });

  it("preserves component order", () => {
    const values = [0.75, 0, -0.5, 0.25];

    expect(createEmbeddingVector(values).values).toEqual(values);
  });

  it("accepts negative, zero, and fractional components", () => {
    expect(createEmbeddingVector([0.25, -0.5, 0, 0.75]).values).toEqual([
      0.25, -0.5, 0, 0.75,
    ]);
  });

  it("rejects an empty vector", () => {
    expect(() => createEmbeddingVector([])).toThrow(RangeError);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects %s components", (_label, component) => {
    expect(() => createEmbeddingVector([0.25, component])).toThrow(RangeError);
  });

  it("is isolated from later changes to the original array", () => {
    const values = [0.25, -0.5, 0, 0.75];
    const vector = createEmbeddingVector(values);

    values[0] = 99;
    values.push(1);

    expect(vector).toEqual({
      values: [0.25, -0.5, 0, 0.75],
      dimensions: 4,
    });
  });
});
