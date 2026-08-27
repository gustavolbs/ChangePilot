import { describe, expect, it } from "vitest";

import { createRepositoryDocument } from "../repositories/repository-document.js";
import { chunkRepositoryDocumentByCodePoints } from "./fixed-size-repository-chunking.js";

const chunk = (
  content: string,
  chunkSize: number,
  chunkOverlap: number,
  path = "src/index.ts",
) =>
  chunkRepositoryDocumentByCodePoints(createRepositoryDocument(path, content), {
    chunkSize,
    chunkOverlap,
  });

describe("chunkRepositoryDocumentByCodePoints", () => {
  it("returns an empty array for an empty document", () => {
    expect(chunk("", 4, 1)).toEqual([]);
  });

  it("validates options before returning an empty result", () => {
    expect(() => chunk("", 0, 0)).toThrow(RangeError);
  });

  it("returns one chunk for a document smaller than chunkSize", () => {
    expect(chunk("ABC", 4, 0)).toEqual([
      {
        path: "src/index.ts",
        index: 0,
        content: "ABC",
      },
    ]);
  });

  it("returns one chunk for a document exactly equal to chunkSize", () => {
    expect(chunk("ABCD", 4, 0)).toEqual([
      {
        path: "src/index.ts",
        index: 0,
        content: "ABCD",
      },
    ]);
  });

  it("splits a document without overlap", () => {
    expect(chunk("ABCDEFGHIJ", 4, 0)).toEqual([
      {
        path: "src/index.ts",
        index: 0,
        content: "ABCD",
      },
      {
        path: "src/index.ts",
        index: 1,
        content: "EFGH",
      },
      {
        path: "src/index.ts",
        index: 2,
        content: "IJ",
      },
    ]);
  });

  it("applies overlap between adjacent chunks", () => {
    expect(chunk("ABCDEFGHIJ", 4, 1)).toEqual([
      {
        path: "src/index.ts",
        index: 0,
        content: "ABCD",
      },
      {
        path: "src/index.ts",
        index: 1,
        content: "DEFG",
      },
      {
        path: "src/index.ts",
        index: 2,
        content: "GHIJ",
      },
    ]);
  });

  it("allows the final chunk to be smaller", () => {
    expect(chunk("ABCDEF", 4, 0).at(-1)?.content).toBe("EF");
  });

  it("does not create a redundant chunk after reaching the end", () => {
    const chunks = chunk("ABCDEFGHIJ", 4, 1);

    expect(chunks).toHaveLength(3);
    expect(chunks.at(-1)?.content).toBe("GHIJ");
  });

  it("assigns sequential indexes starting at zero", () => {
    expect(chunk("ABCDEFGHIJ", 4, 1).map(({ index }) => index)).toEqual([
      0, 1, 2,
    ]);
  });

  it("preserves the document path in every chunk", () => {
    const chunks = chunk("ABCDEFGHIJ", 4, 1, "docs/guide.md");

    expect(chunks.every(({ path }) => path === "docs/guide.md")).toBe(true);
  });

  it("preserves whitespace and line breaks without trimming", () => {
    expect(chunk(" A\nB ", 3, 0)).toEqual([
      {
        path: "src/index.ts",
        index: 0,
        content: " A\n",
      },
      {
        path: "src/index.ts",
        index: 1,
        content: "B ",
      },
    ]);
  });

  it("splits by Unicode code points without dividing an emoji", () => {
    expect(chunk("A😀BC", 2, 1)).toEqual([
      {
        path: "src/index.ts",
        index: 0,
        content: "A😀",
      },
      {
        path: "src/index.ts",
        index: 1,
        content: "😀B",
      },
      {
        path: "src/index.ts",
        index: 2,
        content: "BC",
      },
    ]);
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["fractional", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects a %s chunkSize", (_case, chunkSize) => {
    expect(() => chunk("content", chunkSize, 0)).toThrow(RangeError);
  });

  it.each([
    ["negative", -1],
    ["fractional", 0.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects a %s chunkOverlap", (_case, chunkOverlap) => {
    expect(() => chunk("content", 4, chunkOverlap)).toThrow(RangeError);
  });

  it.each([
    ["equal to", 4],
    ["greater than", 5],
  ])("rejects chunkOverlap %s chunkSize", (_case, chunkOverlap) => {
    expect(() => chunk("content", 4, chunkOverlap)).toThrow(RangeError);
  });
});
