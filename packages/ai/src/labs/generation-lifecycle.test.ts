import { describe, it, expect } from "vitest";
import { createGenerationLifecycleTrace } from "./generation-lifecycle.js";

describe("Generation Lifecycle", () => {
  it("should run the generation lifecycle correctly", async () => {
    const trace = createGenerationLifecycleTrace(
      {
        objective: "Identify the main architectural risk",
        evidence: "diff --git a/src/example.ts...",
      },
      "The change introduces coupling between the API and UI.",
    );

    expect(trace).toEqual([
      {
        input: {
          evidence: "diff --git a/src/example.ts...",
          objective: "Identify the main architectural risk",
        },
        responsible: "application",
        type: "application-input",
      },
      {
        responsible: "client-boundary",
        serializedRequest:
          '{"input":{"objective":"Identify the main architectural risk","evidence":"diff --git a/src/example.ts..."}}',
        type: "request-serialization",
      },
      {
        receivedRequest:
          '{"input":{"objective":"Identify the main architectural risk","evidence":"diff --git a/src/example.ts..."}}',
        responsible: "provider-service",
        type: "provider-api",
      },
      {
        responsible: "provider-service",
        tokenizationInput:
          '{"input":{"objective":"Identify the main architectural risk","evidence":"diff --git a/src/example.ts..."}}',
        type: "tokenization",
      },
      {
        generatedOutput:
          "The change introduces coupling between the API and UI.",
        responsible: "model-runtime",
        type: "generation",
      },
      {
        responsible: "client-boundary",
        serializedResponse:
          '{"output":"The change introduces coupling between the API and UI."}',
        type: "response-serialization",
      },
      {
        output: "The change introduces coupling between the API and UI.",
        responsible: "application",
        type: "application-consumption",
      },
    ]);
  });

  it("should run the generation lifecycle correctly", async () => {
    const modelOutput =
      "The change introduces coupling between the API and UI.";
    const trace = createGenerationLifecycleTrace(
      {
        objective: "Identify the main architectural risk",
        evidence: "diff --git a/src/example.ts...",
      },
      modelOutput,
    );

    const generationEvent = trace[4];

    expect(generationEvent?.type).toBe("generation");

    if (generationEvent?.type !== "generation") {
      throw new Error("Expected a generation event");
    }

    expect(generationEvent.responsible).toBe("model-runtime");
    expect(generationEvent.generatedOutput).toBe(modelOutput);
  });
});
