import { describe, expect, it } from "vitest";
import { createMessageSequence } from "./message-sequence.js";

describe("MessageSequence", () => {
  it("should create a message sequence", () => {
    const sequence = createMessageSequence(
      "Analyze only the supplied evidence.",
      [
        {
          userMessage: "Review the authentication diff.",
          assistantMessage: "The redirect is not validated.",
        },
      ],
      "Now consider the integration test.",
    );

    expect(sequence).toEqual([
      {
        role: "instruction",
        content: "Analyze only the supplied evidence.",
      },
      {
        role: "user",
        content: "Review the authentication diff.",
      },
      {
        role: "assistant",
        content: "The redirect is not validated.",
      },
      {
        role: "user",
        content: "Now consider the integration test.",
      },
    ]);
  });

  it("should always return the same message sequence", () => {
    const props = [
      "Analyze only the supplied evidence.",
      [
        {
          userMessage: "Review the authentication diff.",
          assistantMessage: "The redirect is not validated.",
        },
      ],
      "Now consider the integration test.",
    ] as const;

    const sequence1 = createMessageSequence(...props);
    const sequence2 = createMessageSequence(...props);

    expect(sequence1).toEqual(sequence2);
  });

  it("sequence without history", () => {
    const sequence = createMessageSequence(
      "Analyze only the supplied evidence.",
      [],
      "Now consider the integration test.",
    );

    expect(sequence).toEqual([
      {
        role: "instruction",
        content: "Analyze only the supplied evidence.",
      },
      {
        role: "user",
        content: "Now consider the integration test.",
      },
    ]);
  });

  it("sequence with multiple turns", () => {
    const sequence = createMessageSequence(
      "Analyze only the supplied evidence.",
      [
        {
          userMessage: " Review the authentication diff. ",
          assistantMessage: " The redirect is not validated. ",
        },
        {
          userMessage: "Now consider the integration test.",
          assistantMessage:
            "The integration test is missing a validation step.",
        },
      ],
      "What about the unit tests?",
    );

    expect(sequence).toEqual([
      {
        role: "instruction",
        content: "Analyze only the supplied evidence.",
      },
      {
        role: "user",
        content: " Review the authentication diff. ",
      },
      {
        role: "assistant",
        content: " The redirect is not validated. ",
      },
      {
        role: "user",
        content: "Now consider the integration test.",
      },
      {
        role: "assistant",
        content: "The integration test is missing a validation step.",
      },
      {
        role: "user",
        content: "What about the unit tests?",
      },
    ]);
  });

  it("fails when instruction is empty", () => {
    expect(() => {
      createMessageSequence(
        "",
        [
          {
            userMessage: "Review the authentication diff.",
            assistantMessage: "The redirect is not validated.",
          },
        ],
        "Now consider the integration test.",
      );
    }).toThrow("Instruction must be a non-empty string.");
  });

  it("fails when current user message is empty", () => {
    expect(() => {
      createMessageSequence(
        "Analyze only the supplied evidence.",
        [
          {
            userMessage: "Review the authentication diff.",
            assistantMessage: "The redirect is not validated.",
          },
        ],
        "",
      );
    }).toThrow("Current user message must be a non-empty string.");
  });

  it("fails when any historical message is empty", () => {
    expect(() => {
      createMessageSequence(
        "Analyze only the supplied evidence.",
        [
          {
            userMessage: "",
            assistantMessage: "The redirect is not validated.",
          },
        ],
        "Now consider the integration test.",
      );
    }).toThrow("Historical messages must be non-empty strings.");
  });

  it("fails when any historical message is empty", () => {
    expect(() => {
      createMessageSequence(
        "Analyze only the supplied evidence.",
        [
          {
            userMessage: "Review the authentication diff.",
            assistantMessage: "",
          },
        ],
        "Now consider the integration test.",
      );
    }).toThrow("Historical messages must be non-empty strings.");
  });

  it("fails when any content is only white spaces", () => {
    expect(() => {
      createMessageSequence(
        "Analyze only the supplied evidence.",
        [
          {
            userMessage: "Review the authentication diff.",
            assistantMessage: "            ",
          },
        ],
        "Now consider the integration test.",
      );
    }).toThrow("Historical messages must be non-empty strings.");
  });
});
