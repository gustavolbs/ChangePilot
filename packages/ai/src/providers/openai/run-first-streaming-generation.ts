import OpenAI from "openai";

import { createGenerationParameters } from "../../labs/generation-parameters.js";
import { createMessageSequence } from "../../labs/message-sequence.js";
import { createOpenAIStreamingGenerationAdapter } from "./openai-streaming-generation-adapter.js";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../../generation/generation.js";

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
};

const runFirstStreamedGeneration = async (): Promise<void> => {
  // 1. Configuração externa
  const apiKey = getRequiredEnvironmentVariable("OPENAI_API_KEY");
  const model = getRequiredEnvironmentVariable("OPENAI_MODEL");

  // 2. Client específico da OpenAI
  const client = new OpenAI({
    apiKey,
  });

  // 3. Adapter configurado
  const adapter = createOpenAIStreamingGenerationAdapter({
    model,
    createStream: (request) => client.responses.create(request),
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
  } satisfies GenerationRequest;

  let outputText = "";
  let textDeltaEvents = 0;
  let response: GenerationResponse | undefined;
  // 7. Geração
  for await (const event of adapter.stream(request)) {
    if (event.type === "text-delta") {
      process.stdout.write(event.delta);
      textDeltaEvents += 1;
      outputText += event.delta;
    }

    if (event.type === "finished") {
      response = event.response;
    }
  }

  if (response === undefined) {
    throw new Error("OpenAI: failed to generate a response.");
  }

  // 8. Saída segura
  console.log();
  console.log(
    JSON.stringify(
      {
        request: {
          messages,
          parameters,
        },
        response,
        textDeltaEvents,
        concatenatedDeltasMatchFinalOutput: outputText === response.outputText,
      },
      null,
      2,
    ),
  );
};

runFirstStreamedGeneration().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown generation error.";

  console.error(`Generation failed: ${message}`);
  process.exitCode = 1;
});
