import type { ResponseFunctionToolCall } from "openai/resources/responses/responses.mjs";
import type {
  ToolDefinition,
  ToolExecution,
} from "../../generation/tool-calling.js";
import type { OpenAIResponseSnapshot } from "./types.js";

export const findToolCalls = (response: OpenAIResponseSnapshot) => {
  return response.output
    .filter((e) => e.type === "function_call")
    .filter((e) => e.status === "completed");
};

export const executeToolCalls = async (
  toolCalls: ResponseFunctionToolCall[],
  toolRegistry: Map<string, ToolDefinition>,
) => {
  const providerOutputs = [];
  const executions = [];
  for (const call of toolCalls) {
    const definition = toolRegistry.get(call.name);

    if (!definition) {
      throw new Error(`Unknown tool: ${call.name}`);
    }

    const parsedJson: unknown = JSON.parse(call.arguments);
    const output = await definition.execute(parsedJson);

    const openAIResult = {
      type: "function_call_output",
      call_id: call.call_id,
      output,
    };
    const toolExecution: ToolExecution = {
      call: {
        callId: call.call_id,
        input: call.arguments,
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
