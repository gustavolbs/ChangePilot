import { describe, expect, it } from "vitest";
import { createTokenSequence } from "./token-sequence.js";

describe("TokenSequence", () => {
  it("should create a token sequence", () => {
    const sequence = createTokenSequence("ChangePilot AI!", [
      { id: 101, piece: "Change" },
      { id: 102, piece: "Pilot" },
      { id: 103, piece: " AI" },
      { id: 104, piece: "!" },
    ]);

    expect(sequence.text).toBe("ChangePilot AI!");
    expect(sequence.tokens).toEqual([
      { id: 101, piece: "Change" },
      { id: 102, piece: "Pilot" },
      { id: 103, piece: " AI" },
      { id: 104, piece: "!" },
    ]);
    expect(sequence.tokenIds).toEqual([101, 102, 103, 104]);
    expect(sequence.tokenCount).toBe(4);
    expect(sequence.reconstructedText).toBe("ChangePilot AI!");
  });

  it("should fail a token sequence", () => {
    expect(() => {
      createTokenSequence("ChangePilot AI!", [
        { id: 101, piece: "Change" },
        { id: 103, piece: " AI" },
        { id: 102, piece: "Pilot" },
        { id: 104, piece: "!" },
      ]);
    }).toThrow("Reconstructed text does not match the original text.");
  });
});
