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
      createFrame({
        type: "text-delta",
        delta: "Partial review.",
      }),
      createFrame({
        type: "finished",
        response: {
          finishReason: "completed",
        },
      }),
    ].join("");
    const splitAt = stream.indexOf("review");
    const events: ReviewStreamEvent[] = [];

    await readReviewStream(
      createResponse([stream.slice(0, splitAt), stream.slice(splitAt)]),
      (event) => events.push(event),
    );

    expect(events).toEqual([
      {
        type: "text-delta",
        delta: "Partial review.",
      },
      {
        type: "finished",
        finishReason: "completed",
      },
    ]);
  });

  it("moves the generation to completed after a completed response", () => {
    const state = reduceReviewGeneration(startWithPartialOutput(), {
      type: "finished",
      finishReason: "completed",
    });

    expect(state).toMatchObject({
      status: "completed",
      output: "Partial review.",
      error: null,
    });
  });

  it.each([
    [
      "max-output-tokens",
      "The review stopped because it reached the output token limit.",
    ],
    ["content-filter", "The review was interrupted by the content filter."],
  ] as const)(
    "moves %s to error while preserving partial output",
    async (finishReason, expectedError) => {
      let state = reduceReviewGeneration(initialReviewGenerationState, {
        type: "start",
      });

      await readReviewStream(
        createResponse([
          createFrame({
            type: "text-delta",
            delta: "Partial review.",
          }),
          createFrame({
            type: "finished",
            response: {
              finishReason,
            },
          }),
        ]),
        (event) => {
          state = reduceReviewGeneration(state, event);
        },
      );

      expect(state).toMatchObject({
        status: "error",
        output: "Partial review.",
        error: expectedError,
      });
    },
  );

  it("rejects an unsupported finish reason", async () => {
    const response = createResponse([
      createFrame({
        type: "finished",
        response: {
          finishReason: "unknown",
        },
      }),
    ]);

    await expect(readReviewStream(response, () => undefined)).rejects.toThrow(
      "Invalid finished event.",
    );
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
