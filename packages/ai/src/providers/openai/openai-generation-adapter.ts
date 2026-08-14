import { mapRequest, mapResponse, mapTools, zodMapRequest } from "./mappers.js";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses.mjs";
import type {
  StructuredGenerationRequest,
  StructuredGenerationResponse,
} from "../../generation/structured-generation.js";
import type {
  ToolExecution,
  ToolGenerationRequest,
  ToolGenerationResponse,
} from "../../generation/tool-calling.js";
import type {
  OpenAIGenerationAdapterOptions,
  OpenAIGenerationAdapter,
} from "./types.js";
import {
  containsRefusal,
  validateGenerationRequest,
  validateMaxToolRounds,
  validateModel,
  validateSchemaName,
  validateTools,
} from "./validators.js";
import { executeToolCalls, findToolCalls } from "./utils.js";
import type { TokenUsage } from "../../generation/generation.js";

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

      const mappedTools = mapTools(request.tools);
      const toolRegistry = new Map(
        request.tools.map((definition) => [definition.name, definition]),
      );

      const mappedRequest = mapRequest({
        model: options.model,
        request,
      });
      let accumulatedInput = mappedRequest.input;
      let rounds: number = 0;
      let accumulatedUsage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
      const toolExecutions: ToolExecution[] = [];

      while (true) {
        const openAIRequest: ResponseCreateParamsNonStreaming = {
          ...mappedRequest,
          input: accumulatedInput,
          tools: mappedTools,
          parallel_tool_calls: false,
        };

        const openAIResponse = await options.createResponse(openAIRequest);
        if (!openAIResponse.usage) {
          throw new RangeError("OpenAI: usage not defined at the response.");
        }

        if (containsRefusal(openAIResponse)) {
          throw new Error("OpenAI: Model refused the tool response.");
        }
        accumulatedUsage = {
          inputTokens:
            accumulatedUsage.inputTokens + openAIResponse.usage?.input_tokens,
          outputTokens:
            accumulatedUsage.outputTokens + openAIResponse.usage?.output_tokens,
          totalTokens:
            accumulatedUsage.totalTokens + openAIResponse.usage?.total_tokens,
        };

        const toolCalls = findToolCalls(openAIResponse);
        if (toolCalls.length === 0 || openAIResponse.status !== "completed") {
          const baseResponse = mapResponse(openAIResponse);
          return {
            ...baseResponse,
            usage: accumulatedUsage,
            toolExecutions,
          };
        }

        if (rounds >= request.maxToolRounds) {
          throw new RangeError("OpenAI: Too many tool calls.");
        }

        rounds += 1;
        const result = await executeToolCalls(toolCalls, toolRegistry);
        accumulatedInput = [
          ...accumulatedInput,
          ...openAIResponse.output,
          ...result.providerOutputs,
        ];

        toolExecutions.push(...result.executions);
      }
    },
  };
}
