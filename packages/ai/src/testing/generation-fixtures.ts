import type { GenerationRequest } from "../generation/generation.js";
import { createGenerationParameters } from "../labs/generation-parameters.js";
import { createMessageSequence } from "../labs/message-sequence.js";

type GenerationRequestFixtureInput = Readonly<{
  instruction?: string;
  currentUserMessage?: string;
  maxOutputTokens?: number;
}>;

export const createGenerationRequestFixture = (
  input: GenerationRequestFixtureInput = {},
): GenerationRequest => ({
  messages: createMessageSequence(
    input.instruction ?? "Review only the supplied change.",
    [],
    input.currentUserMessage ?? "Review this test change.",
  ),
  parameters: createGenerationParameters({
    sampling: {
      strategy: "temperature",
      temperature: 0,
    },
    maxOutputTokens: input.maxOutputTokens ?? 500,
    stopSequences: [],
  }),
});
