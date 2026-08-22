import { describe, expect, it } from "vitest";

import { searchByLiteralText } from "./literal-search.js";

describe("searchByLiteralText", () => {
  it("finds candidates containing an exact identifier", () => {
    const candidates = [
      "throw new UnauthorizedError();",
      "return UnauthorizedError.from(error);",
    ];

    expect(searchByLiteralText("UnauthorizedError", candidates)).toEqual(
      candidates,
    );
  });

  it("matches literal text case-insensitively", () => {
    expect(
      searchByLiteralText("unauthorizederror", [
        "throw new UnauthorizedError();",
      ]),
    ).toEqual(["throw new UnauthorizedError();"]);
  });

  it("excludes unrelated candidates", () => {
    expect(
      searchByLiteralText("UnauthorizedError", [
        "throw new ValidationError();",
        "throw new UnauthorizedError();",
        "throw new NotFoundError();",
      ]),
    ).toEqual(["throw new UnauthorizedError();"]);
  });

  it("preserves the original order of matching candidates", () => {
    expect(
      searchByLiteralText("session", [
        "const sessionStore = createSessionStore();",
        "const user = await loadUser();",
        "await sessionStore.delete(sessionId);",
        "return sessionStore.read(sessionId);",
      ]),
    ).toEqual([
      "const sessionStore = createSessionStore();",
      "await sessionStore.delete(sessionId);",
      "return sessionStore.read(sessionId);",
    ]);
  });

  it.each(["", "   "])("returns no results for an empty query: %j", (query) => {
    expect(searchByLiteralText(query, ["UnauthorizedError"])).toEqual([]);
  });

  it("makes the semantic gap explicit when relevant code has no literal query match", () => {
    const semanticallyRelevantCandidate = [
      "if (claims.exp <= clock.now()) {",
      "  throw new UnauthorizedError();",
      "}",
    ].join("\n");

    expect(
      searchByLiteralText("Where are expired sessions rejected?", [
        semanticallyRelevantCandidate,
      ]),
    ).toEqual([]);
  });
});
