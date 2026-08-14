import type {
  GenerationAdapter,
  GenerationRequest,
} from "../../generation/generation.js";
import { mapRequest, mapResponse, mapTools } from "./mappers.js";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseFunctionToolCall,
} from "openai/resources/responses/responses.mjs";
import type { ConversationMessage } from "../../labs/message-sequence.js";
import {
  StructuredGenerationAdapter,
  StructuredGenerationRequest,
  StructuredGenerationResponse,
} from "../../generation/structured-generation.js";
import { zodTextFormat } from "openai/helpers/zod";
import {
  ToolCallingAdapter,
  ToolDefinition,
  ToolGenerationRequest,
  ToolGenerationResponse,
} from "../../generation/tool-calling.js";

export type OpenAIResponseSnapshot = Pick<
  Response,
  | "id"
  | "model"
  | "status"
  | "output"
  | "output_text"
  | "usage"
  | "incomplete_details"
  | "error"
>;

type OpenAIGenerationAdapterOptions = Readonly<{
  model: string;
  createResponse: (
    request: ResponseCreateParamsNonStreaming,
  ) => Promise<OpenAIResponseSnapshot>;
}>;

export type OpenAIGenerationAdapter = GenerationAdapter &
  StructuredGenerationAdapter &
  ToolCallingAdapter;

type ZodMapInput<Output> = Readonly<{
  model: string;
  request: StructuredGenerationRequest<Output>;
}>;

export function createOpenAIGenerationAdapter(
  options: OpenAIGenerationAdapterOptions,
): OpenAIGenerationAdapter {
  validateModel(options.model);

  return {
    async generate(request) {
      validateGenerationRequest(request);

      const openAIRequest = mapRequest({
        model: options.model,
        request,
      });

      const openAIResponse = await options.createResponse(openAIRequest);

      return mapResponse(openAIResponse);
    },

    async generateStructured<Output>(
      request: StructuredGenerationRequest<Output>,
    ): Promise<StructuredGenerationResponse<Output>> {
      validateGenerationRequest(request);
      validateSchemaName(request.output.schemaName);

      const openAIRequest = zodMapRequest({
        model: options.model,
        request,
      });

      const openAIResponse = await options.createResponse(openAIRequest);

      if (containsRefusal(openAIResponse)) {
        throw new Error("OpenAI: Model refused the structured response.");
      }

      const baseResponse = mapResponse(openAIResponse);

      if (baseResponse.finishReason !== "completed") {
        throw new Error("OpenAI: Response not completed yet.");
      }

      let parsedJson: unknown;

      try {
        parsedJson = JSON.parse(baseResponse.outputText);
      } catch {
        throw new Error("OpenAI: Structured response is not valid JSON.");
      }

      const validation = request.output.schema.safeParse(parsedJson);

      if (!validation.success) {
        throw new Error(
          "OpenAI: Structured response does not match the requested schema.",
        );
      }

      return {
        ...baseResponse,
        finishReason: "completed",
        output: validation.data,
      };
    },

    async generateWithTools(
      request: ToolGenerationRequest,
    ): Promise<ToolGenerationResponse> {
      validateGenerationRequest(request);
      validateTools(request.tools);
      validateMaxToolRounds(request.maxToolRounds);
      const input = [];
      const mappedTools = mapTools(request.tools);

      while (true) {
        let providerInput = request.messages;
        let rounds = 0;
        const toolExecutions = [];
        let accumulatedUsage = {};

        const mappedPartialRequest = mapRequest({
          model: options.model,
          request,
        });

        const openAIRequest: ResponseCreateParamsNonStreaming = {
          ...mappedPartialRequest,
          tools: mappedTools,
          parallel_tool_calls: false,
        };

        const openAIResponse = await options.createResponse(openAIRequest);

        if (containsRefusal(openAIResponse)) {
          throw new Error("OpenAI: Model refused the structured response.");
        }
        const toolCalls = findToolCalls(openAIResponse);

        if (toolCalls.length === 0) {
          // HOW DO I DEFINE THIS
          const baseResponse = mapResponse(openAIResponse);
          return {
            ...baseResponse,
            toolExecutions,
            usage: accumulatedUsage,
          };
        }

        if (rounds >= request.maxToolRounds) {
          throw new RangeError("OpenAI: Too many tool calls.");
        }

        rounds += 1;
        const outputs = await executeToolCalls(toolCalls);

        input.push(...openAIResponse.output);
        // HOW DO I DEFINE THIS
        input.push(...outputs);
      }

      // // NEED TO RUN THE LOOP AND FIND FUNCTION CALLS ON MESSAGES UNTIL NO MORE TOOLS
      // const baseResponse = mapResponse(openAIResponse);

      // if (baseResponse.finishReason !== "completed") {
      //   throw new Error("OpenAI: Response not completed yet.");
      // }
    },
  };
}

const validateGenerationRequest = (request: GenerationRequest): void => {
  validateMessages(request.messages);
  validateStopSequences(request.parameters.stopSequences);

  if (request.parameters.stopSequences.length > 0) {
    throw new RangeError(
      "OpenAI: stopSequences are not supported by this adapter.",
    );
  }
};

const validateModel = (model: string): void => {
  if (!model?.trim()) {
    throw new Error("OpenAI: Model name cannot be empty.");
  }
};

const validateSchemaName = (schemaName: string): void => {
  if (!schemaName.trim()) {
    throw new RangeError("OpenAI: Schema name cannot be empty.");
  }

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(schemaName)) {
    throw new RangeError(
      "OpenAI: Schema name must contain only letters, numbers, underscores, or hyphens and be at most 64 characters.",
    );
  }
};

const containsRefusal = (response: OpenAIResponseSnapshot): boolean =>
  response.output.some(
    (item) =>
      item.type === "message" &&
      item.content.some((content) => content.type === "refusal"),
  );

const validateMessages = (messages: readonly ConversationMessage[]): void => {
  if (messages.length < 2) {
    throw new RangeError(
      "OpenAI: Message sequence must contain an instruction and at least one subsequent message.",
    );
  }

  messages.forEach((m) => {
    if (!m.content.trim() || !m.role.trim()) {
      throw new RangeError("OpenAI: message and role cannot be empty");
    }
  });
};

const validateStopSequences = (stopSequences: readonly string[]) => {
  if (!Array.isArray(stopSequences)) {
    throw new RangeError("Stop sequences must be an array.");
  }

  for (const sequence of stopSequences) {
    if (typeof sequence !== "string" || !sequence.trim()) {
      throw new RangeError("Stop sequences must be non-empty strings.");
    }
  }
};

const zodMapRequest = <Output>({
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

const validateTools = (tools: readonly ToolDefinition[]) => {
  if (!Array.isArray(tools)) {
    throw new Error("OpenAI: `tools` must be a valid array.");
  }
  tools.forEach((tool) => {
    validateTool(tool);
  });
};

const validateMaxToolRounds = (maxToolsNumbers: number) => {
  if (
    !maxToolsNumbers ||
    maxToolsNumbers < 0 ||
    !Number.isInteger(maxToolsNumbers) ||
    !Number.isFinite(maxToolsNumbers)
  ) {
    throw new RangeError("OpenAI: maxToolsNumber must be a positive integer.");
  }
};

export const validateTool = <Input>(tool: ToolDefinition<Input>) => {
  if (
    !tool.name.trim() ||
    !tool.description.trim() ||
    !tool.inputSchema ||
    !tool.execute
  ) {
    throw new RangeError(
      "OpenAI: all the tools fields must be rightly filled.",
    );
  }
};

const findToolCalls = (response: OpenAIResponseSnapshot) => {
  return response.output.filter((e) => e.type === "function_call");
};

const executeToolCalls = async (tools: ResponseFunctionToolCall[]) => {
  tools.forEach((tool) => {
    const args = JSON.parse(tool.arguments);

    tool.name;
  });
};
