import { describe, expect, it } from "vitest";

import {
  calculateGenerationLatency,
  createGenerationLatencyRecord,
  type GenerationLatencyTimestamps,
} from "./generation-latency.js";

const timestampsWithTokens: GenerationLatencyTimestamps = {
  requestStartedAtMs: 100,
  providerStartedAtMs: 125,
  firstTokenAtMs: 325,
  lastTokenAtMs: 725,
  finishedAtMs: 750,
};

const expectedLatencyWithTokens = {
  timeToFirstTokenMs: 225,
  timeToLastTokenMs: 625,
  providerTimeToFirstTokenMs: 200,
  providerTimeToLastTokenMs: 600,
  providerDurationMs: 625,
  applicationPreparationMs: 25,
  totalDurationMs: 650,
};

describe("generation latency", () => {
  it("calculates generation latency when tokens were received", () => {
    expect(calculateGenerationLatency(timestampsWithTokens)).toEqual(
      expectedLatencyWithTokens,
    );
  });

  it("preserves null token metrics when no tokens were received", () => {
    expect(
      calculateGenerationLatency({
        requestStartedAtMs: 100,
        providerStartedAtMs: 125,
        firstTokenAtMs: null,
        lastTokenAtMs: null,
        finishedAtMs: 300,
      }),
    ).toEqual({
      timeToFirstTokenMs: null,
      timeToLastTokenMs: null,
      providerTimeToFirstTokenMs: null,
      providerTimeToLastTokenMs: null,
      providerDurationMs: 175,
      applicationPreparationMs: 25,
      totalDurationMs: 200,
    });
  });

  it("creates a latency record without changing generation metadata", () => {
    expect(
      createGenerationLatencyRecord({
        feature: "change-review",
        response: {
          id: "resp_latency_123",
          model: "gpt-5.6-luna",
          finishReason: "completed",
        },
        timestamps: timestampsWithTokens,
      }),
    ).toEqual({
      requestId: "resp_latency_123",
      feature: "change-review",
      model: "gpt-5.6-luna",
      finishReason: "completed",
      latency: expectedLatencyWithTokens,
    });
  });
});
