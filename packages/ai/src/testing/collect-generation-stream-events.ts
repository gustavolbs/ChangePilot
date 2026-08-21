import type { GenerationStreamEvent } from "../generation/streaming-generation.js";

export const collectGenerationStreamEvents = async (
  stream: AsyncIterable<GenerationStreamEvent>,
): Promise<GenerationStreamEvent[]> => {
  const events: GenerationStreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  return events;
};
