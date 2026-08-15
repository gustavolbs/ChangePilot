import type { GenerationRequest, GenerationResponse } from "./generation.js";

export type GenerationStreamEvent =
  | Readonly<{
      type: "text-delta";
      delta: string;
    }>
  | Readonly<{
      type: "finished";
      response: GenerationResponse;
    }>
  | Readonly<{
      type: "error";
      message: string;
    }>;

export type GenerationStreamOptions = Readonly<{
  signal?: AbortSignal;
}>;

export interface StreamingGenerationAdapter {
  stream(
    request: GenerationRequest,
    options?: GenerationStreamOptions,
  ): AsyncIterable<GenerationStreamEvent>;
}
