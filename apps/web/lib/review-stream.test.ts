import { describe, expect, it } from "vitest";

import {
  getReviewStreamErrorMessage,
  initialReviewGenerationState,
  readReviewStream,
  reduceReviewGeneration,
  type ReviewGenerationState,
  type ReviewStreamEvent,
} from "./review-stream";

const encoder = new TextEncoder();

const createResponse = (chunks: readonly string[]): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.close();
      },
    }),
  );

const createFrame = (event: unknown): string =>
  `data: ${JSON.stringify(event)}\n\n`;

const startWithPartialOutput = (): ReviewGenerationState => {
  const streaming = reduceReviewGeneration(initialReviewGenerationState, {
    type: "start",
  });

  return reduceReviewGeneration(streaming, {
    type: "text-delta",
    delta: "Partial review.",
  });
};

describe("review stream", () => {
  it("parses an event divided between two response chunks", async () => {
    const stream = [
      createFrame({ type: "text-delta", delta: "Partial review." }),
      createFrame({ type: "finished" }),
    ].join("");
    const splitAt = stream.indexOf("review");
    const events: ReviewStreamEvent[] = [];

    await readReviewStream(
      createResponse([stream.slice(0, splitAt), stream.slice(splitAt)]),
      (event) => events.push(event),
    );

    expect(events).toEqual([
      { type: "text-delta", delta: "Partial review." },
      { type: "finished" },
    ]);
  });

  it("moves the generation to completed after finished", () => {
    const state = reduceReviewGeneration(startWithPartialOutput(), {
      type: "finished",
    });

    expect(state).toMatchObject({
      status: "completed",
      output: "Partial review.",
      error: null,
    });
  });

  it("moves Stop to cancelled without removing partial output", () => {
    const state = reduceReviewGeneration(startWithPartialOutput(), {
      type: "cancelled",
    });

    expect(state).toMatchObject({
      status: "cancelled",
      output: "Partial review.",
      error: null,
    });
  });

  it("keeps partial output when the stream emits an error", async () => {
    let state = reduceReviewGeneration(initialReviewGenerationState, {
      type: "start",
    });

    await readReviewStream(
      createResponse([
        createFrame({ type: "text-delta", delta: "Partial review." }),
        createFrame({ type: "error", message: "Provider stream failed." }),
      ]),
      (event) => {
        state = reduceReviewGeneration(state, event);
      },
    );

    expect(state).toMatchObject({
      status: "error",
      output: "Partial review.",
      error: "Provider stream failed.",
    });
  });

  it("keeps partial output when the stream closes prematurely", async () => {
    let state = reduceReviewGeneration(initialReviewGenerationState, {
      type: "start",
    });

    try {
      await readReviewStream(
        createResponse([
          createFrame({ type: "text-delta", delta: "Partial review." }),
        ]),
        (event) => {
          state = reduceReviewGeneration(state, event);
        },
      );
    } catch (error) {
      state = reduceReviewGeneration(state, {
        type: "error",
        message: getReviewStreamErrorMessage(error),
      });
    }

    expect(state).toMatchObject({
      status: "error",
      output: "Partial review.",
      error: "The connection was closed before finishing the stream.",
    });
  });

  it("rejects an invalid SSE payload", async () => {
    const response = createResponse([
      createFrame({ type: "text-delta", delta: 42 }),
    ]);

    await expect(readReviewStream(response, () => undefined)).rejects.toThrow(
      "Invalid text-delta event.",
    );
  });
});
