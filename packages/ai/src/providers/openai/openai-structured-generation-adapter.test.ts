import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { StructuredGenerationRequest } from "../../generation/structured-generation.js";
import { createGenerationParameters } from "../../labs/generation-parameters.js";
import type { ConversationMessage } from "../../labs/message-sequence.js";
import {
  type ChangeReview,
  ChangeReviewSchema,
} from "../../reviews/change-review.js";
import { createOpenAIGenerationAdapter } from "./openai-generation-adapter.js";
import type { OpenAIResponseSnapshot } from "./types.js";

type AdapterOptions = Parameters<typeof createOpenAIGenerationAdapter>[0];
type CreateResponse = AdapterOptions["createResponse"];
type OpenAIRequest = Parameters<CreateResponse>[0];

const model = "gpt-5.1";

const messages: readonly ConversationMessage[] = [
  {
    role: "instruction",
    content: "  Review only the supplied evidence.  ",
  },
  {
    role: "user",
    content: "Review the authentication change.\nKeep this exact text.",
  },
  {
    role: "assistant",
    content: "The current evidence is incomplete.",
  },
  {
    role: "user",
    content: "Now include the integration test evidence.",
  },
];

const parameters = createGenerationParameters({
  sampling: {
    strategy: "temperature",
    temperature: 0.2,
  },
  maxOutputTokens: 1_200,
  stopSequences: [],
});

const validReview = {
  summary: "The change validates ownership before updating the record.",
  verdict: "approve",
  findings: [
    {
      severity: "low",
      description: "The ownership check is covered by an integration test.",
      evidence: "The test rejects updates from a different owner.",
    },
  ],
} satisfies ChangeReview;

const createStructuredRequest = (
  overrides: Partial<StructuredGenerationRequest<ChangeReview>> = {},
): StructuredGenerationRequest<ChangeReview> => ({
  messages,
  parameters,
  output: {
    schemaName: "change_review",
    schema: ChangeReviewSchema,
  },
  ...overrides,
});

const createProviderResponse = (
  overrides: Partial<OpenAIResponseSnapshot> = {},
): OpenAIResponseSnapshot => ({
  id: "resp_structured_123",
  model,
  status: "completed",
  incomplete_details: null,
  output: [],
  output_text: JSON.stringify(validReview),
  error: null,
  usage: {
    input_tokens: 120,
    output_tokens: 30,
    total_tokens: 150,
    input_tokens_details: {
      cache_write_tokens: 0,
      cached_tokens: 0,
    },
    output_tokens_details: {
      reasoning_tokens: 0,
    },
  },
  ...overrides,
});

const createResponseFake = (response = createProviderResponse()) =>
  vi.fn(
    (_request: OpenAIRequest): Promise<OpenAIResponseSnapshot> =>
      Promise.resolve(response),
  );

describe("OpenAI structured generation adapter", () => {
  it("sends a strict JSON Schema format generated from ChangeReviewSchema", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateStructured(createStructuredRequest());

    const providerRequest = createResponse.mock.calls[0]?.[0];
    expect(providerRequest?.text?.format).toMatchObject({
      type: "json_schema",
      name: "change_review",
      strict: true,
      schema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
          },
          verdict: {
            type: "string",
            enum: ["approve", "request-changes", "insufficient-evidence"],
          },
          findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                },
                description: {
                  type: "string",
                },
                evidence: {
                  type: "string",
                },
              },
              required: ["severity", "description", "evidence"],
              additionalProperties: false,
            },
          },
        },
        required: ["summary", "verdict", "findings"],
        additionalProperties: false,
      },
    });
  });

  it("preserves messages and generation parameters in the structured request", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateStructured(createStructuredRequest());

    expect(createResponse.mock.calls[0]?.[0]).toMatchObject({
      model,
      instructions: "  Review only the supplied evidence.  ",
      input: [
        {
          role: "user",
          content: "Review the authentication change.\nKeep this exact text.",
        },
        {
          role: "assistant",
          content: "The current evidence is incomplete.",
        },
        {
          role: "user",
          content: "Now include the integration test evidence.",
        },
      ],
      temperature: 0.2,
      max_output_tokens: 1_200,
      reasoning: {
        effort: "none",
      },
      store: false,
    });
    expect(createResponse.mock.calls[0]?.[0]).not.toHaveProperty("top_p");
  });

  it.each(["", " \n\t "])(
    "rejects an empty schema name (%j)",
    async (schemaName) => {
      const createResponse = createResponseFake();
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(
        adapter.generateStructured(
          createStructuredRequest({
            output: {
              schemaName,
              schema: ChangeReviewSchema,
            },
          }),
        ),
      ).rejects.toThrow(/schema name/i);
      expect(createResponse).not.toHaveBeenCalled();
    },
  );

  it.each(["change review", "change.review", "change/review"])(
    "rejects an invalid schema name (%j)",
    async (schemaName) => {
      const createResponse = createResponseFake();
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(
        adapter.generateStructured(
          createStructuredRequest({
            output: {
              schemaName,
              schema: ChangeReviewSchema,
            },
          }),
        ),
      ).rejects.toThrow(/schema name/i);
      expect(createResponse).not.toHaveBeenCalled();
    },
  );

  it("returns a typed ChangeReview for a complete valid response", async () => {
    const outputText = JSON.stringify(validReview);
    const createResponse = createResponseFake(
      createProviderResponse({ output_text: outputText }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateStructured(
      createStructuredRequest(),
    );

    expectTypeOf(response.output).toEqualTypeOf<ChangeReview>();
    expect(response).toEqual({
      id: "resp_structured_123",
      model,
      outputText,
      finishReason: "completed",
      usage: {
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
      },
      output: validReview,
    });
  });

  it("preserves outputText exactly", async () => {
    const outputText = `  ${JSON.stringify(validReview)}\n`;
    const createResponse = createResponseFake(
      createProviderResponse({ output_text: outputText }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateStructured(
      createStructuredRequest(),
    );

    expect(response.outputText).toBe(outputText);
  });

  it("preserves provider usage without recalculating it", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        usage: {
          input_tokens: 7,
          output_tokens: 11,
          total_tokens: 42,
          input_tokens_details: {
            cache_write_tokens: 0,
            cached_tokens: 0,
          },
          output_tokens_details: {
            reasoning_tokens: 0,
          },
        },
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generateStructured(
      createStructuredRequest(),
    );

    expect(response.usage).toEqual({
      inputTokens: 7,
      outputTokens: 11,
      totalTokens: 42,
    });
  });

  it("rejects syntactically invalid JSON", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({ output_text: '{"summary":' }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/valid JSON|JSON/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects valid JSON incompatible with ChangeReviewSchema", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        output_text: JSON.stringify({
          summary: 42,
          verdict: "approve",
          findings: "none",
        }),
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/schema/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown enum value", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        output_text: JSON.stringify({
          ...validReview,
          verdict: "approve-with-comments",
        }),
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/schema/i);
  });

  it("rejects a response missing a required field", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        output_text: JSON.stringify({
          summary: validReview.summary,
          verdict: validReview.verdict,
        }),
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/schema/i);
  });

  it("rejects max_output_tokens incompleteness before parsing", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
        output_text: '{"summary":',
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/completed|incomplete|max.output.tokens/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects content_filter incompleteness", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        status: "incomplete",
        incomplete_details: {
          reason: "content_filter",
        },
        output_text: "",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/completed|incomplete|content.filter/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects a model refusal explicitly", async () => {
    const refusalOutput = [
      {
        id: "msg_refusal_123",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [
          {
            type: "refusal",
            refusal: "I cannot provide that review.",
          },
        ],
      },
    ] satisfies OpenAIResponseSnapshot["output"];
    const createResponse = createResponseFake(
      createProviderResponse({
        output: refusalOutput,
        output_text: "",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/refusal|refused/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("calls createResponse exactly once for successful generation", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateStructured(createStructuredRequest());

    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("fails fast without retry when parsing fails", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({ output_text: "not-json" }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generateStructured(createStructuredRequest()),
    ).rejects.toThrow(/JSON/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("uses only the injected fake and performs no real provider call", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generateStructured(createStructuredRequest());

    expect(createResponse).toHaveBeenCalledOnce();
  });
});
