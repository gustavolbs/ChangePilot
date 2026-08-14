import type { GenerationRequest, GenerationResponse } from "./generation.js";

export type GenerationStreamEvent =
  | Readonly<{
      type: "text-delta";
      delta: string;
    }>
  | Readonly<{
      type: "finished";
      response: GenerationResponse;
    }>;

export interface StreamingGenerationAdapter {
  stream(request: GenerationRequest): AsyncIterable<GenerationStreamEvent>;
}
