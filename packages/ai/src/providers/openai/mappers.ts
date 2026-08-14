import type {
  ResponseCreateParamsNonStreaming,
  Tool,
} from "openai/resources/responses/responses";
import type {
  FinishReason,
  GenerationRequest,
  GenerationResponse,
} from "../../generation/generation.js";
import { ToolDefinition } from "../../generation/tool-calling.js";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import { OpenAIResponseSnapshot, ZodMapInput } from "./types.js";

type MapRequestInput = {
  model: string;
  request: GenerationRequest;
};

export const mapRequest = (
  input: MapRequestInput,
): ResponseCreateParamsNonStreaming => {
  const { messages, parameters } = input.request;
  const [instruction, ...conversationMessages] = messages;

  if (instruction === undefined || instruction.role !== "instruction") {
    throw new Error("The first message must have the instruction role.");
  }

  const openAIInput = conversationMessages.map((message) => {
    if (message.role === "instruction") {
      throw new Error("Only the first message may have the instruction role.");
    }

    return {
      role: message.role,
      content: message.content,
    };
  });

  const sampling =
    parameters.sampling.strategy === "temperature"
      ? {
          temperature: parameters.sampling.temperature,
        }
      : {
          top_p: parameters.sampling.topP,
        };

  return {
    model: input.model,
    instructions: instruction.content,
    input: openAIInput,
    reasoning: {
      effort: "none" as const,
    },
    ...sampling,
    max_output_tokens: parameters.maxOutputTokens,
    store: false,
  };
};

export const mapResponse = (
  response: OpenAIResponseSnapshot,
): GenerationResponse => {
  if (response.usage === null || response.usage === undefined) {
    throw new Error("OpenAI response does not contain token usage.");
  }

  const finishReason = mapFinishReason(response);

  if (
    finishReason === "completed" &&
    response.output_text.trim().length === 0
  ) {
    throw new Error(
      "OpenAI returned a completed response without output text.",
    );
  }

  return {
    id: response.id,
    model: response.model,
    outputText: response.output_text,
    finishReason,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.total_tokens,
    },
  };
};

export const mapFinishReason = (
  response: Pick<OpenAIResponseSnapshot, "status" | "incomplete_details">,
): FinishReason => {
  if (response.status === "completed") {
    return "completed";
  }

  if (response.status === "incomplete") {
    const reason = response.incomplete_details?.reason;

    if (reason === "max_output_tokens") {
      return "max-output-tokens";
    }

    if (reason === "content_filter") {
      return "content-filter";
    }

    throw new Error(
      `OpenAI returned an incomplete response with an unsupported reason: ${
        reason ?? "missing"
      }.`,
    );
  }

  throw new Error(
    `OpenAI response status cannot produce a GenerationResponse: ${response.status}.`,
  );
};

const mapTool = (tool: ToolDefinition): Tool => {
  const copy = { ...tool };

  return zodResponsesFunction({
    name: copy.name,
    parameters: copy.inputSchema,
    description: copy.description,
  });
};

export const mapTools = (tools: readonly ToolDefinition[]): Tool[] => {
  return tools.map((tool) => mapTool(tool));
};

export const zodMapRequest = <Output>({
  model,
  request,
}: ZodMapInput<Output>): ResponseCreateParamsNonStreaming => {
  const mappedRequest = mapRequest({
    model,
    request,
  });

  return {
    ...mappedRequest,
    text: {
      format: zodTextFormat(request.output.schema, request.output.schemaName),
    },
  };
};
