import OpenAI from "openai";

import { createGenerationParameters } from "../../generation/generation-parameters.js";
import { createMessageSequence } from "../../generation/message-sequence.js";
import { createOpenAIGenerationAdapter } from "./openai-generation-adapter.js";
import {
  ChangeReview,
  ChangeReviewSchema,
} from "../../reviews/change-review.js";
import { StructuredGenerationRequest } from "../../generation/structured-generation.js";

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
};

const runFirstStructuredGeneration = async (): Promise<void> => {
  // 1. Configuração externa
  const apiKey = getRequiredEnvironmentVariable("OPENAI_API_KEY");
  const model = getRequiredEnvironmentVariable("OPENAI_MODEL");

  // 2. Client específico da OpenAI
  const client = new OpenAI({
    apiKey,
  });

  // 3. Adapter configurado
  const adapter = createOpenAIGenerationAdapter({
    model,
    createResponse: (request) => client.responses.create(request),
  });

  // 4. Mensagens no formato interno do ChangePilot
  const messages = createMessageSequence(
    [
      "You are ChangePilot.",
      "Review only the supplied repository evidence.",
      "Do not invent facts that are not present.",
    ].join(" "),
    [],
    [
      "Review this change:",
      "- src/auth/session.ts changes session expiration from 24 hours to 30 days.",
      "- No authentication tests were changed.",
    ].join("\n"),
  );

  // 5. Parâmetros no formato interno do ChangePilot
  const parameters = createGenerationParameters({
    sampling: {
      strategy: "temperature",
      temperature: 0,
    },
    maxOutputTokens: 500,
    stopSequences: [],
  });

  // 6. Request provider-neutral
  const request = {
    messages,
    parameters,
    output: {
      schemaName: "change_review",
      schema: ChangeReviewSchema,
    },
  } satisfies StructuredGenerationRequest<ChangeReview>;

  // 7. Geração
  const response = await adapter.generateStructured(request);

  // 8. Saída segura
  console.log(
    JSON.stringify(
      {
        request: {
          messages,
          parameters,
          schemaName: request.output.schemaName,
        },
        response,
      },
      null,
      2,
    ),
  );
};

runFirstStructuredGeneration().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown generation error.";

  console.error(`Generation failed: ${message}`);
  process.exitCode = 1;
});
