import { ResponseCreateParamsStreaming } from "openai/resources/responses/responses.mjs";
import type { GenerationRequest, GenerationResponse } from "./generation.js";
import { OpenAIResponseSnapshot } from "../providers/openai/types.js";

export type GenerationStreamEvent =
  | Readonly<{
      type: "text-delta";
      delta: string;
    }>
  | Readonly<{
      type: "finished";
      response: GenerationResponse;
    }>;

export type OpenAIStreamingGenerationAdapterOptions = Readonly<{
  model: string;
  createStream: (
    request: ResponseCreateParamsStreaming,
    // ESSE TIPO TÁ CERTO MESMO?
  ) => Promise<AsyncIterable<GenerationStreamEvent>>;
}>;

export interface StreamingGenerationAdapter {
  stream(request: GenerationRequest): AsyncIterable<GenerationStreamEvent>;
}
