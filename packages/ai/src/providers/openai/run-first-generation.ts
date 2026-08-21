import OpenAI from "openai";

import type { GenerationRequest } from "../../generation/generation.js";
import { createGenerationParameters } from "../../generation/generation-parameters.js";
import { createMessageSequence } from "../../generation/message-sequence.js";
import { createOpenAIGenerationAdapter } from "./openai-generation-adapter.js";

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
};

const runFirstGeneration = async (): Promise<void> => {
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
    "You are ChangePilot, a software-change analysis assistant.\nAnswer with one concise sentence.",
    [],
    "Why should a code review conclusion be grounded in repository evidence?",
  );

  // 5. Parâmetros no formato interno do ChangePilot
  const parameters = createGenerationParameters({
    sampling: {
      strategy: "temperature",
      temperature: 0,
    },
    maxOutputTokens: 200,
    stopSequences: [],
  });

  // 6. Request provider-neutral
  const request: GenerationRequest = {
    messages,
    parameters,
  };

  // 7. Geração
  const response = await adapter.generate(request);

  // 8. Saída segura
  console.log(
    JSON.stringify(
      {
        request,
        response,
      },
      null,
      2,
    ),
  );
};

runFirstGeneration().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown generation error.";

  console.error(`Generation failed: ${message}`);
  process.exitCode = 1;
});
