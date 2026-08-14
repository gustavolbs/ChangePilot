import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";

import {
  defineTool,
  type ToolDefinition,
  type ToolGenerationRequest,
} from "../../generation/tool-calling.js";
import { createGenerationParameters } from "../../labs/generation-parameters.js";
import type { ConversationMessage } from "../../labs/message-sequence.js";
import { getChangeEvidence } from "../../reviews/get-change-evidence.js";
import { createOpenAIGenerationAdapter } from "./openai-generation-adapter.js";
import type { OpenAIResponseSnapshot } from "./types.js";

type AdapterOptions = Parameters<typeof createOpenAIGenerationAdapter>[0];
type CreateResponse = AdapterOptions["createResponse"];
type OpenAIRequest = Parameters<CreateResponse>[0];
type FunctionCall = Extract<
  OpenAIResponseSnapshot["output"][number],
  { type: "function_call" }
>;

const model = "gpt-5.1";
const expectedEvidence = JSON.stringify({
  path: "src/auth/session.ts",
  change: "Session expiration changed from 24 hours to 30 days.",
  testsChanged: false,
});

const messages: readonly ConversationMessage[] = [
  {
    role: "instruction",
    content: "Review only the supplied repository evidence.",
  },
  {
    role: "user",
    content: "Review src/auth/session.ts.",
  },
];

const parameters = createGenerationParameters({
  sampling: {
    strategy: "temperature",
    temperature: 0,
  },
  maxOutputTokens: 500,
  stopSequences: [],
});

const createToolRequest = (
  overrides: Partial<ToolGenerationRequest> = {},
): ToolGenerationRequest => ({
  messages,
  parameters,
  tools: [getChangeEvidence],
  maxToolRounds: 3,
  ...overrides,
});

const createUsage = (
  inputTokens = 10,
  outputTokens = 5,
  totalTokens = 15,
): NonNullable<OpenAIResponseSnapshot["usage"]> => ({
  input_tokens: inputTokens,
  output_tokens: outputTokens,
  total_tokens: totalTokens,
  input_tokens_details: {
    cache_write_tokens: 0,
    cached_tokens: 0,
  },
  output_tokens_details: {
    reasoning_tokens: 0,
  },
});

const createProviderResponse = (
  overrides: Partial<OpenAIResponseSnapshot> = {},
): OpenAIResponseSnapshot => ({
  id: "resp_tools_123",
  model,
  status: "completed",
  incomplete_details: null,
  output: [],
  output_text: "The session expiration changed from 24 hours to 30 days.",
  error: null,
  usage: createUsage(),
  ...overrides,
});

const createFunctionCall = (
  overrides: Partial<FunctionCall> = {},
): FunctionCall => ({
  type: "function_call",
  call_id: "call_123",
  name: "get_change_evidence",
  arguments: JSON.stringify({ path: "src/auth/session.ts" }),
  status: "completed",
  ...overrides,
});

const createResponseFake = (...responses: OpenAIResponseSnapshot[]) => {
  const queuedResponses =
    responses.length > 0 ? responses : [createProviderResponse()];
  let responseIndex = 0;

  return vi.fn(async (_request: OpenAIRequest) => {
    const response = queuedResponses[responseIndex];
    responseIndex += 1;

    if (response === undefined) {
      throw new Error("Fake createResponse exhausted its response queue.");
    }

    return response;
  });
};

const createSpiedTool = (
  execute: (input: { path: string }) => Promise<string>,
): ToolDefinition =>
  defineTool({
    name: "get_change_evidence",
    description: "Returns evidence about a changed repository file.",
    inputSchema: z.object({
      path: z.string().min(1),
    }),
    execute,
  });

describe("OpenAI tool-calling adapter", () => {
  it("maps the tool name, description, and strict Zod schema", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateWithTools(createToolRequest());

    expect(createResponse.mock.calls[0]?.[0]).toMatchObject({
      tools: [
        {
          type: "function",
          name: "get_change_evidence",
          description: "Returns evidence about a changed repository file.",
          strict: true,
          parameters: {
            type: "object",
            properties: {
              path: {
                type: "string",
                minLength: 1,
              },
            },
            required: ["path"],
            additionalProperties: false,
          },
        },
      ],
      parallel_tool_calls: false,
    });
  });

  it("maps and executes tools with heterogeneous input schemas", async () => {
    const searchExecutor = vi.fn(
      async (input: { query: string; limit: number }) => {
        expectTypeOf(input).toEqualTypeOf<{
          query: string;
          limit: number;
        }>();
        return JSON.stringify({ matches: [], ...input });
      },
    );
    const searchChanges = defineTool({
      name: "search_changes",
      description: "Searches changed files using a query and result limit.",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number(),
      }),
      execute: searchExecutor,
    });
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [
          createFunctionCall({
            call_id: "call_search",
            name: "search_changes",
            arguments: JSON.stringify({ query: "session", limit: 2 }),
          }),
        ],
        output_text: "",
      }),
      createProviderResponse({ output_text: "Search completed." }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateWithTools(
      createToolRequest({ tools: [getChangeEvidence, searchChanges] }),
    );

    expect(createResponse.mock.calls[0]?.[0].tools).toMatchObject([
      {
        type: "function",
        name: "get_change_evidence",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
          additionalProperties: false,
        },
      },
      {
        type: "function",
        name: "search_changes",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "number" },
          },
          required: ["query", "limit"],
          additionalProperties: false,
        },
      },
    ]);
    expect(searchExecutor).toHaveBeenCalledExactlyOnceWith({
      query: "session",
      limit: 2,
    });
  });

  it("rejects duplicate tools before calling the provider", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(
        createToolRequest({
          tools: [getChangeEvidence, getChangeEvidence],
        }),
      ),
    ).rejects.toThrow(/duplicate tool|get_change_evidence/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("rejects an empty tool list before calling the provider", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(createToolRequest({ tools: [] })),
    ).rejects.toThrow(/tool/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN])(
    "rejects invalid maxToolRounds (%s) before calling the provider",
    async (maxToolRounds) => {
      const createResponse = createResponseFake();
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(
        adapter.generateWithTools(createToolRequest({ maxToolRounds })),
      ).rejects.toThrow(/max|round|tool/i);
      expect(createResponse).not.toHaveBeenCalled();
    },
  );

  it("passes valid, schema-compatible arguments to the typed executor", async () => {
    const executor = vi.fn(async (input: { path: string }) => {
      expectTypeOf(input).toEqualTypeOf<{ path: string }>();
      return JSON.stringify({ receivedPath: input.path });
    });
    const tool = createSpiedTool(executor);
    const functionCall = createFunctionCall();
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [functionCall],
        output_text: "",
      }),
      createProviderResponse(),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateWithTools(createToolRequest({ tools: [tool] }));

    expect(executor).toHaveBeenCalledExactlyOnceWith({
      path: "src/auth/session.ts",
    });
  });

  it("rejects syntactically invalid JSON arguments without retry", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [createFunctionCall({ arguments: '{"path":' })],
        output_text: "",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(createToolRequest({ tools: [tool] })),
    ).rejects.toThrow(/invalid JSON|arguments/i);
    expect(executor).not.toHaveBeenCalled();
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects arguments incompatible with the Zod schema", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [
          createFunctionCall({
            arguments: JSON.stringify({ path: "" }),
          }),
        ],
        output_text: "",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(createToolRequest({ tools: [tool] })),
    ).rejects.toThrow(/invalid input|tool/i);
    expect(executor).not.toHaveBeenCalled();
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown tool without retry", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [createFunctionCall({ name: "unknown_tool" })],
        output_text: "",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(createToolRequest()),
    ).rejects.toThrow(/unknown tool/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("preserves call_id and sends the executor output unchanged", async () => {
    const exactOutput = "  exact tool output\n";
    const executor = vi.fn(async () => exactOutput);
    const tool = createSpiedTool(executor);
    const functionCall = createFunctionCall({ call_id: "call_exact_456" });
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [functionCall],
        output_text: "",
      }),
      createProviderResponse(),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateWithTools(
      createToolRequest({ tools: [tool] }),
    );

    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(createResponse.mock.calls[1]?.[0].input).toEqual([
      {
        role: "user",
        content: "Review src/auth/session.ts.",
      },
      functionCall,
      {
        type: "function_call_output",
        call_id: "call_exact_456",
        output: exactOutput,
      },
    ]);
    expect(response.toolExecutions).toEqual([
      {
        call: {
          callId: "call_exact_456",
          name: "get_change_evidence",
          input: {
            path: "src/auth/session.ts",
          },
        },
        result: {
          type: "tool-result",
          callId: "call_exact_456",
          output: exactOutput,
        },
      },
    ]);
  });

  it("terminates immediately when the response has no tool call", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const createResponse = createResponseFake(
      createProviderResponse({ output_text: "No tool was required." }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateWithTools(
      createToolRequest({ tools: [tool] }),
    );

    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(executor).not.toHaveBeenCalled();
    expect(response.outputText).toBe("No tool was required.");
    expect(response.toolExecutions).toEqual([]);
  });

  it("does not execute a function call from an incomplete response", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const createResponse = createResponseFake(
      createProviderResponse({
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
        output: [createFunctionCall()],
        output_text: "Partial response.",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateWithTools(
      createToolRequest({ tools: [tool] }),
    );

    expect(response.finishReason).toBe("max-output-tokens");
    expect(executor).not.toHaveBeenCalled();
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("does not execute a function call when the model also refuses", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const refusalMessage = {
      id: "msg_tool_refusal_123",
      type: "message",
      role: "assistant",
      status: "completed",
      content: [
        {
          type: "refusal",
          refusal: "I cannot perform that tool request.",
        },
      ],
    } satisfies OpenAIResponseSnapshot["output"][number];
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [refusalMessage, createFunctionCall()],
        output_text: "",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(createToolRequest({ tools: [tool] })),
    ).rejects.toThrow(/refusal|refused/i);
    expect(executor).not.toHaveBeenCalled();
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("performs a second request after one tool call", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [createFunctionCall()],
        output_text: "",
      }),
      createProviderResponse({ output_text: "Final response." }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateWithTools(createToolRequest({ tools: [tool] }));

    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("continues the loop when another tool call is returned", async () => {
    const executor = vi.fn(async ({ path }: { path: string }) =>
      JSON.stringify({ path }),
    );
    const tool = createSpiedTool(executor);
    const firstCall = createFunctionCall({ call_id: "call_first" });
    const secondCall = createFunctionCall({ call_id: "call_second" });
    const createResponse = createResponseFake(
      createProviderResponse({ output: [firstCall], output_text: "" }),
      createProviderResponse({ output: [secondCall], output_text: "" }),
      createProviderResponse({ output_text: "Final after two tools." }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateWithTools(
      createToolRequest({ tools: [tool] }),
    );

    expect(createResponse).toHaveBeenCalledTimes(3);
    expect(executor).toHaveBeenCalledTimes(2);
    expect(response.toolExecutions).toHaveLength(2);
    expect(response.toolExecutions.map(({ call }) => call.callId)).toEqual([
      "call_first",
      "call_second",
    ]);
  });

  it("stops an infinite tool loop at maxToolRounds", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [createFunctionCall({ call_id: "call_first" })],
        output_text: "",
      }),
      createProviderResponse({
        output: [createFunctionCall({ call_id: "call_second" })],
        output_text: "",
      }),
      createProviderResponse({ output_text: "Must not be requested." }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(
        createToolRequest({ tools: [tool], maxToolRounds: 1 }),
      ),
    ).rejects.toThrow(/too many tool calls|max/i);
    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("stops immediately when the executor throws", async () => {
    const executor = vi.fn(async () => {
      throw new Error("Evidence source unavailable.");
    });
    const tool = createSpiedTool(executor);
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [createFunctionCall()],
        output_text: "",
      }),
      createProviderResponse({ output_text: "Must not be requested." }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateWithTools(createToolRequest({ tools: [tool] })),
    ).rejects.toThrow("Evidence source unavailable.");
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("aggregates usage and preserves the exact final output text", async () => {
    const executor = vi.fn(async () => expectedEvidence);
    const tool = createSpiedTool(executor);
    const finalOutput = "  Final evidence-grounded review.\n";
    const createResponse = createResponseFake(
      createProviderResponse({
        output: [createFunctionCall()],
        output_text: "",
        usage: createUsage(5, 7, 20),
      }),
      createProviderResponse({
        output_text: finalOutput,
        usage: createUsage(11, 13, 40),
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateWithTools(
      createToolRequest({ tools: [tool] }),
    );

    expect(response.outputText).toBe(finalOutput);
    expect(response.usage).toEqual({
      inputTokens: 16,
      outputTokens: 20,
      totalTokens: 60,
    });
    expect(response.toolExecutions).toHaveLength(1);
  });

  it("uses the in-memory get_change_evidence executor", async () => {
    await expect(
      getChangeEvidence.execute({ path: "src/auth/session.ts" }),
    ).resolves.toBe(expectedEvidence);
  });

  it("never performs a real OpenAI call", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({ output_text: "Offline final response." }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateWithTools(createToolRequest());

    expect(createResponse).toHaveBeenCalledOnce();
  });
});
