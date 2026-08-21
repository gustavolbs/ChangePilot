import OpenAI from "openai";

import { createGenerationParameters } from "../../generation/generation-parameters.js";
import { createMessageSequence } from "../../generation/message-sequence.js";
import { createOpenAIGenerationAdapter } from "./openai-generation-adapter.js";
import { ToolGenerationRequest } from "../../generation/tool-calling.js";
import { getChangeEvidence } from "../../reviews/get-change-evidence.js";

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
};

const runFirstToolGeneration = async (): Promise<void> => {
  // 1. Configuração externa
  const apiKey = getRequiredEnvironmentVariable("OPENAI_API_KEY");
  const model = getRequiredEnvironmentVariable("OPENAI_MODEL");

  // 2. Client específico da OpenAI
  const client = new OpenAI({
    apiKey,
  });

  // 3. Adapter configurado
  let providerRequests = 0;
  const adapter = createOpenAIGenerationAdapter({
    model,
    async createResponse(request) {
      providerRequests += 1;
      return client.responses.create(request);
    },
  });

  // 4. Mensagens no formato interno do ChangePilot
  const messages = createMessageSequence(
    [
      "You are ChangePilot.",
      "Review only the supplied repository evidence.",
      "Do not invent facts that are not present.",
      "use the available get_change_evidence tool to check on each provided path before producing the review",
    ].join(" "),
    [],
    ["Review this change:", "- src/auth/session.ts"].join("\n"),
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
    maxToolRounds: 5,
    tools: [getChangeEvidence],
  } satisfies ToolGenerationRequest;

  // 7. Geração
  const response = await adapter.generateWithTools(request);

  // 8. Saída segura
  console.log(
    JSON.stringify(
      {
        providerRequests,
        request,
        response,
      },
      null,
      2,
    ),
  );
};

runFirstToolGeneration().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown generation error.";

  console.error(`Generation failed: ${message}`);
  process.exitCode = 1;
});
