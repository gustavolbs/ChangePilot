import { describe, expect, it } from "vitest";
import {
  createGenerationParameters,
  type GenerationParametersInput,
} from "./generation-parameters.js";

const expectRangeErrorForField = (
  create: () => unknown,
  fieldName: RegExp,
): void => {
  expect(create).toThrow(RangeError);
  expect(create).toThrow(fieldName);
};

describe("createGenerationParameters", () => {
  it("creates a configuration with temperature sampling", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "temperature",
        temperature: 0.2,
      },
      maxOutputTokens: 1_200,
      stopSequences: [],
    });

    expect(parameters).toEqual({
      sampling: {
        strategy: "temperature",
        temperature: 0.2,
      },
      maxOutputTokens: 1_200,
      stopSequences: [],
    });
  });

  it("creates a configuration with top-p sampling", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "top-p",
        topP: 0.9,
      },
      maxOutputTokens: 800,
      stopSequences: ["</review>"],
    });

    expect(parameters).toEqual({
      sampling: {
        strategy: "top-p",
        topP: 0.9,
      },
      maxOutputTokens: 800,
      stopSequences: ["</review>"],
    });
  });

  it("narrows temperature sampling by strategy", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "temperature",
        temperature: 0.2,
      },
      maxOutputTokens: 1_200,
      stopSequences: [],
    });

    if (parameters.sampling.strategy !== "temperature") {
      throw new Error("Expected temperature sampling");
    }

    expect(parameters.sampling.temperature).toBe(0.2);
  });

  it("narrows top-p sampling by strategy", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "top-p",
        topP: 0.9,
      },
      maxOutputTokens: 800,
      stopSequences: [],
    });

    if (parameters.sampling.strategy !== "top-p") {
      throw new Error("Expected top-p sampling");
    }

    expect(parameters.sampling.topP).toBe(0.9);
  });

  it.each([0, 2])(
    "accepts temperature at the inclusive boundary %s",
    (temperature) => {
      const parameters = createGenerationParameters({
        sampling: {
          strategy: "temperature",
          temperature,
        },
        maxOutputTokens: 1,
        stopSequences: [],
      });

      expect(parameters.sampling).toEqual({
        strategy: "temperature",
        temperature,
      });
    },
  );

  it("accepts topP at the inclusive upper boundary", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "top-p",
        topP: 1,
      },
      maxOutputTokens: 1,
      stopSequences: [],
    });

    expect(parameters.sampling).toEqual({
      strategy: "top-p",
      topP: 1,
    });
  });

  it("accepts an empty stop sequence list", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "temperature",
        temperature: 1,
      },
      maxOutputTokens: 100,
      stopSequences: [],
    });

    expect(parameters.stopSequences).toEqual([]);
  });

  it("preserves multiple stop sequences in their original order", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "top-p",
        topP: 0.75,
      },
      maxOutputTokens: 500,
      stopSequences: ["</review>", "</response>", "END"],
    });

    expect(parameters.stopSequences).toEqual([
      "</review>",
      "</response>",
      "END",
    ]);
  });

  it("uses trim only for validation and preserves stop sequences exactly", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "temperature",
        temperature: 0.5,
      },
      maxOutputTokens: 300,
      stopSequences: ["  </review>  ", "\nEND\t"],
    });

    expect(parameters.stopSequences).toEqual(["  </review>  ", "\nEND\t"]);
  });

  it("preserves numeric values exactly", () => {
    const parameters = createGenerationParameters({
      sampling: {
        strategy: "temperature",
        temperature: 1.234_567,
      },
      maxOutputTokens: 12_345,
      stopSequences: [],
    });

    if (parameters.sampling.strategy !== "temperature") {
      throw new Error("Expected temperature sampling");
    }

    expect(parameters.sampling.temperature).toBe(1.234_567);
    expect(parameters.maxOutputTokens).toBe(12_345);
  });

  it("returns a new configuration object", () => {
    const input: GenerationParametersInput = {
      sampling: {
        strategy: "temperature",
        temperature: 0.2,
      },
      maxOutputTokens: 1_200,
      stopSequences: [],
    };

    const parameters = createGenerationParameters(input);

    expect(parameters).not.toBe(input);
    expect(parameters).toEqual(input);
  });

  it("creates a new sampling object", () => {
    const input: GenerationParametersInput = {
      sampling: {
        strategy: "top-p",
        topP: 0.9,
      },
      maxOutputTokens: 800,
      stopSequences: [],
    };

    const parameters = createGenerationParameters(input);

    expect(parameters.sampling).not.toBe(input.sampling);
    expect(parameters.sampling).toEqual(input.sampling);
  });

  it("creates a new stopSequences array", () => {
    const input: GenerationParametersInput = {
      sampling: {
        strategy: "temperature",
        temperature: 0.2,
      },
      maxOutputTokens: 1_200,
      stopSequences: ["</review>"],
    };

    const parameters = createGenerationParameters(input);

    expect(parameters.stopSequences).not.toBe(input.stopSequences);
    expect(parameters.stopSequences).toEqual(input.stopSequences);
  });

  it("does not mutate the input, sampling object, or stopSequences array", () => {
    const sampling = Object.freeze({
      strategy: "top-p" as const,
      topP: 0.9,
    });
    const stopSequences = Object.freeze(["</review>", "</response>"]);
    const input: GenerationParametersInput = Object.freeze({
      sampling,
      maxOutputTokens: 800,
      stopSequences,
    });
    const before = structuredClone(input);

    expect(() => createGenerationParameters(input)).not.toThrow();
    expect(input).toEqual(before);
    expect(input.sampling).toEqual(before.sampling);
    expect(input.stopSequences).toEqual(before.stopSequences);
  });

  it("takes a snapshot independent of later changes to the original array", () => {
    const stopSequences = ["</review>"];

    const parameters = createGenerationParameters({
      sampling: {
        strategy: "temperature",
        temperature: 0.2,
      },
      maxOutputTokens: 1_200,
      stopSequences,
    });

    stopSequences.push("</response>");

    expect(parameters.stopSequences).toEqual(["</review>"]);
  });

  it("takes a snapshot independent of later changes to sampling", () => {
    const sampling = {
      strategy: "temperature" as const,
      temperature: 0.2,
    };

    const parameters = createGenerationParameters({
      sampling,
      maxOutputTokens: 1_200,
      stopSequences: [],
    });

    sampling.temperature = 1.5;

    expect(parameters.sampling).toEqual({
      strategy: "temperature",
      temperature: 0.2,
    });
  });

  it("is deterministic for the same input", () => {
    const input: GenerationParametersInput = {
      sampling: {
        strategy: "top-p",
        topP: 0.9,
      },
      maxOutputTokens: 800,
      stopSequences: ["</review>"],
    };

    expect(createGenerationParameters(input)).toEqual(
      createGenerationParameters(input),
    );
  });

  describe("validation", () => {
    it.each([
      ["negative", -0.1],
      ["greater than two", 2.1],
      ["positive infinity", Number.POSITIVE_INFINITY],
      ["negative infinity", Number.NEGATIVE_INFINITY],
      ["NaN", Number.NaN],
    ])("rejects a %s temperature", (_caseName, invalidTemperature) => {
      const create = () =>
        createGenerationParameters({
          sampling: {
            strategy: "temperature",
            temperature: invalidTemperature,
          },
          maxOutputTokens: 100,
          stopSequences: [],
        });

      expectRangeErrorForField(create, /temperature/i);
    });

    it.each([
      ["zero", 0],
      ["negative", -0.1],
      ["greater than one", 1.1],
      ["positive infinity", Number.POSITIVE_INFINITY],
      ["negative infinity", Number.NEGATIVE_INFINITY],
      ["NaN", Number.NaN],
    ])("rejects a %s topP", (_caseName, invalidTopP) => {
      const create = () =>
        createGenerationParameters({
          sampling: {
            strategy: "top-p",
            topP: invalidTopP,
          },
          maxOutputTokens: 100,
          stopSequences: [],
        });

      expectRangeErrorForField(create, /top[- ]?p/i);
    });

    it.each([
      ["zero", 0],
      ["negative", -1],
      ["fractional", 1.5],
      ["positive infinity", Number.POSITIVE_INFINITY],
      ["negative infinity", Number.NEGATIVE_INFINITY],
      ["NaN", Number.NaN],
    ])("rejects a %s maxOutputTokens", (_caseName, invalidMaxOutputTokens) => {
      const create = () =>
        createGenerationParameters({
          sampling: {
            strategy: "temperature",
            temperature: 1,
          },
          maxOutputTokens: invalidMaxOutputTokens,
          stopSequences: [],
        });

      expectRangeErrorForField(create, /max(?:imum)?\s*output\s*tokens?/i);
    });

    it.each([
      ["empty", ""],
      ["whitespace-only", " \n\t "],
    ])("rejects a %s stop sequence", (_caseName, invalidStopSequence) => {
      const create = () =>
        createGenerationParameters({
          sampling: {
            strategy: "temperature",
            temperature: 1,
          },
          maxOutputTokens: 100,
          stopSequences: ["</review>", invalidStopSequence],
        });

      expectRangeErrorForField(create, /stop\s*sequences?/i);
    });
  });
});
