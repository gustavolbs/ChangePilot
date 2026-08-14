import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
} from "openai/resources/responses/responses.mjs";
import type {
  ToolDefinition,
  ToolExecution,
} from "../../generation/tool-calling.js";
import type { OpenAIResponseSnapshot } from "./types.js";

export const findToolCalls = (response: OpenAIResponseSnapshot) => {
  return response.output.filter((e) => e.type === "function_call");
};

export const executeToolCalls = async (
  toolCalls: ResponseFunctionToolCall[],
  toolRegistry: ReadonlyMap<string, ToolDefinition>,
) => {
  const providerOutputs: ResponseInputItem.FunctionCallOutput[] = [];
  const executions: ToolExecution[] = [];
  for (const call of toolCalls) {
    const definition = toolRegistry.get(call.name);

    if (!definition) {
      throw new Error(`Unknown tool: ${call.name}`);
    }

    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(call.arguments);
    } catch {
      throw new Error(
        `OpenAI: Tool "${call.name}" returned invalid JSON arguments.`,
      );
    }

    const output = await definition.execute(parsedJson);
    const openAIResult: ResponseInputItem.FunctionCallOutput = {
      type: "function_call_output",
      call_id: call.call_id,
      output,
    };
    const toolExecution: ToolExecution = {
      call: {
        callId: call.call_id,
        input: parsedJson,
        name: call.name,
      },
      result: {
        type: "tool-result",
        callId: call.call_id,
        output,
      },
    };

    providerOutputs.push(openAIResult);
    executions.push(toolExecution);
  }
  return { providerOutputs, executions };
};
