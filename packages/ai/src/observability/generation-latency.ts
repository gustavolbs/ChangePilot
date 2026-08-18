import type {
  GenerationResponse,
  FinishReason,
} from "../generation/generation.js";
import type { AiFeature } from "../usage/generation-cost.js";

export type GenerationLatencyTimestamps = Readonly<{
  requestStartedAtMs: number;
  providerStartedAtMs: number;
  firstTokenAtMs: number | null;
  lastTokenAtMs: number | null;
  finishedAtMs: number;
}>;

export type MonotonicClock = () => number;

export type GenerationLatency = Readonly<{
  timeToFirstTokenMs: number | null;
  timeToLastTokenMs: number | null;
  providerTimeToFirstTokenMs: number | null;
  providerTimeToLastTokenMs: number | null;
  providerDurationMs: number;
  applicationPreparationMs: number;
  totalDurationMs: number;
}>;

export const calculateGenerationLatency = (
  timestamps: GenerationLatencyTimestamps,
): GenerationLatency => {
  return {
    timeToFirstTokenMs: timestamps.firstTokenAtMs
      ? timestamps.firstTokenAtMs - timestamps.requestStartedAtMs
      : null,
    timeToLastTokenMs: timestamps.lastTokenAtMs
      ? timestamps.lastTokenAtMs - timestamps.requestStartedAtMs
      : null,
    providerTimeToFirstTokenMs: timestamps.firstTokenAtMs
      ? timestamps.firstTokenAtMs - timestamps.providerStartedAtMs
      : null,
    providerTimeToLastTokenMs: timestamps.lastTokenAtMs
      ? timestamps.lastTokenAtMs - timestamps.providerStartedAtMs
      : null,
    providerDurationMs:
      timestamps.finishedAtMs - timestamps.providerStartedAtMs,
    applicationPreparationMs:
      timestamps.providerStartedAtMs - timestamps.requestStartedAtMs,
    totalDurationMs: timestamps.finishedAtMs - timestamps.requestStartedAtMs,
  };
};

export type GenerationLatencyRecord = Readonly<{
  requestId: string;
  feature: AiFeature;
  model: string;
  finishReason: FinishReason;
  latency: GenerationLatency;
}>;

export type CreateGenerationLatencyRecordInput = Readonly<{
  feature: AiFeature;
  response: Pick<GenerationResponse, "id" | "model" | "finishReason">;
  timestamps: GenerationLatencyTimestamps;
}>;

export const createGenerationLatencyRecord = (
  input: CreateGenerationLatencyRecordInput,
): GenerationLatencyRecord => {
  const latency = calculateGenerationLatency(input.timestamps);
  return {
    feature: input.feature,
    finishReason: input.response.finishReason,
    latency,
    model: input.response.model,
    requestId: input.response.id,
  };
};
