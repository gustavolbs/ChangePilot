import { describe, expect, it } from "vitest";

import { createRepositoryDocument } from "./repository-document.js";

describe("createRepositoryDocument", () => {
  it("creates a document with its path and content", () => {
    expect(
      createRepositoryDocument("src/index.ts", "export const value = 1;"),
    ).toEqual({
      path: "src/index.ts",
      content: "export const value = 1;",
    });
  });

  it("preserves content exactly", () => {
    const content = "  first line\n\nsecond line  \n";

    expect(createRepositoryDocument("notes.txt", content).content).toBe(
      content,
    );
  });

  it("accepts empty content", () => {
    expect(createRepositoryDocument("empty.txt", "")).toEqual({
      path: "empty.txt",
      content: "",
    });
  });

  it.each(["", "   ", "\t\n"])("rejects the empty path %j", (path) => {
    expect(() => createRepositoryDocument(path, "content")).toThrow(RangeError);
  });

  it("does not add information to the document", () => {
    const document = createRepositoryDocument("src/index.ts", "content");

    expect(Object.keys(document)).toEqual(["path", "content"]);
  });
});
