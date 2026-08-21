import { describe, expect, it } from "vitest";

import type {
  GenerationStreamEvent,
  StreamingGenerationAdapter,
} from "../generation/streaming-generation.js";
import { collectGenerationStreamEvents } from "./collect-generation-stream-events.js";
import { createGenerationRequestFixture } from "./generation-fixtures.js";

type TextDeltaEvent = Extract<GenerationStreamEvent, { type: "text-delta" }>;

type FinishedEvent = Extract<GenerationStreamEvent, { type: "finished" }>;

type StreamingGenerationAdapterContractOptions = Readonly<{
  name: string;
  createAdapter: () => StreamingGenerationAdapter;
}>;

const finishReasons = [
  "completed",
  "max-output-tokens",
  "content-filter",
] as const;

export const runStreamingGenerationAdapterContract = ({
  name,
  createAdapter,
}: StreamingGenerationAdapterContractOptions): void => {
  describe(`${name} streaming generation contract`, () => {
    it("emits deltas followed by exactly one finished event", async () => {
      const adapter = createAdapter();

      const events = await collectGenerationStreamEvents(
        adapter.stream(createGenerationRequestFixture()),
      );

      const textDeltaEvents = events.filter(
        (event): event is TextDeltaEvent => event.type === "text-delta",
      );

      const finishedEvents = events.filter(
        (event): event is FinishedEvent => event.type === "finished",
      );

      expect(textDeltaEvents.length).toBeGreaterThan(0);
      expect(finishedEvents).toHaveLength(1);
      expect(events.at(-1)?.type).toBe("finished");

      const finishedEvent = finishedEvents[0];

      if (!finishedEvent) {
        throw new Error("Contract: finished event was not emitted.");
      }

      const concatenatedDeltas = textDeltaEvents
        .map((event) => event.delta)
        .join("");

      expect(concatenatedDeltas).toBe(finishedEvent.response.outputText);
    });

    it("returns a valid generation response", async () => {
      const adapter = createAdapter();

      const events = await collectGenerationStreamEvents(
        adapter.stream(createGenerationRequestFixture()),
      );

      const finishedEvent = events.find(
        (event): event is FinishedEvent => event.type === "finished",
      );

      if (!finishedEvent) {
        throw new Error("Contract: finished event was not emitted.");
      }

      const { response } = finishedEvent;
      const { usage } = response;

      expect(response.id.trim()).not.toBe("");
      expect(response.model.trim()).not.toBe("");
      expect(finishReasons).toContain(response.finishReason);

      expect(Number.isSafeInteger(usage.inputTokens)).toBe(true);
      expect(Number.isSafeInteger(usage.outputTokens)).toBe(true);
      expect(Number.isSafeInteger(usage.totalTokens)).toBe(true);

      expect(usage.inputTokens).toBeGreaterThanOrEqual(0);
      expect(usage.outputTokens).toBeGreaterThanOrEqual(0);
      expect(usage.totalTokens).toBeGreaterThanOrEqual(0);

      expect(usage.totalTokens).toBe(usage.inputTokens + usage.outputTokens);
    });
  });
};
