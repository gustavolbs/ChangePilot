import { describe, expect, it, vi } from "vitest";

import type {
  GenerationRequest,
  GenerationResponse,
} from "../../generation/generation.js";
import type { StructuredGenerationRequest } from "../../generation/structured-generation.js";
import { createGenerationParameters } from "../../labs/generation-parameters.js";
import type { ConversationMessage } from "../../labs/message-sequence.js";
import {
  type ChangeReview,
  ChangeReviewSchema,
} from "../../reviews/change-review.js";
import {
  createOpenAIGenerationAdapter,
  type OpenAIResponseSnapshot,
} from "./openai-generation-adapter.js";

type AdapterOptions = Parameters<typeof createOpenAIGenerationAdapter>[0];
type CreateResponse = AdapterOptions["createResponse"];
type OpenAIRequest = Parameters<CreateResponse>[0];
type OpenAIResponse = Awaited<ReturnType<CreateResponse>>;

const model = "gpt-5.1";

const messages: readonly ConversationMessage[] = [
  {
    role: "instruction",
    content: "Review only the supplied evidence.",
  },
  {
    role: "user",
    content: "Review the authentication change.",
  },
];

const createRequest = (
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  messages,
  parameters: createGenerationParameters({
    sampling: {
      strategy: "temperature",
      temperature: 0.2,
    },
    maxOutputTokens: 1_200,
    stopSequences: [],
  }),
  ...overrides,
});

const createStructuredRequest = (
  overrides: Partial<StructuredGenerationRequest<ChangeReview>> = {},
): StructuredGenerationRequest<ChangeReview> => ({
  ...createRequest(),
  output: {
    schemaName: "change_review",
    schema: ChangeReviewSchema,
  },
  ...overrides,
});

const createProviderResponse = (
  overrides: Partial<OpenAIResponseSnapshot> = {},
): OpenAIResponse => ({
  id: "resp_123",
  model,
  status: "completed",
  incomplete_details: null,
  output: [],
  output_text: "Approve the change.",
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
  vi.fn((_request: OpenAIRequest) => Promise.resolve(response));

describe("createOpenAIGenerationAdapter", () => {
  it("maps temperature sampling without sending top_p", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generate(createRequest());

    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(createResponse).toHaveBeenCalledWith({
      model,
      instructions: "Review only the supplied evidence.",
      input: [
        {
          role: "user",
          content: "Review the authentication change.",
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
    expect(createResponse.mock.calls[0]?.[0]).not.toHaveProperty("text.format");
  });

  it("maps top-p sampling without sending temperature", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });
    const request = createRequest({
      parameters: createGenerationParameters({
        sampling: {
          strategy: "top-p",
          topP: 0.9,
        },
        maxOutputTokens: 800,
        stopSequences: [],
      }),
    });

    await adapter.generate(request);

    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(createResponse).toHaveBeenCalledWith({
      model,
      instructions: "Review only the supplied evidence.",
      input: [
        {
          role: "user",
          content: "Review the authentication change.",
        },
      ],
      top_p: 0.9,
      max_output_tokens: 800,
      reasoning: {
        effort: "none",
      },
      store: false,
    });
    expect(createResponse.mock.calls[0]?.[0]).not.toHaveProperty("temperature");
  });

  it("maps maxOutputTokens to max_output_tokens", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generate(
      createRequest({
        parameters: createGenerationParameters({
          sampling: {
            strategy: "temperature",
            temperature: 0,
          },
          maxOutputTokens: 321,
          stopSequences: [],
        }),
      }),
    );

    expect(createResponse.mock.calls[0]?.[0]).toMatchObject({
      max_output_tokens: 321,
    });
  });

  it("maps the initial instruction separately and preserves conversation order and content", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });
    const exactMessages: readonly ConversationMessage[] = [
      {
        role: "instruction",
        content: "  Instruction with spacing.\nSecond line.  ",
      },
      {
        role: "user",
        content: "  First user message.  ",
      },
      {
        role: "assistant",
        content: "First assistant message.\nSecond line.",
      },
      {
        role: "user",
        content: "Final user message.\n  Keep indentation.  ",
      },
    ];

    await adapter.generate(createRequest({ messages: exactMessages }));

    const providerRequest = createResponse.mock.calls[0]?.[0];
    expect(providerRequest?.instructions).toBe(
      "  Instruction with spacing.\nSecond line.  ",
    );
    expect(providerRequest?.input).toEqual([
      {
        role: "user",
        content: "  First user message.  ",
      },
      {
        role: "assistant",
        content: "First assistant message.\nSecond line.",
      },
      {
        role: "user",
        content: "Final user message.\n  Keep indentation.  ",
      },
    ]);
  });

  it('always sends reasoning.effort as "none" and store as false', async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generate(createRequest());

    expect(createResponse.mock.calls[0]?.[0]).toMatchObject({
      reasoning: {
        effort: "none",
      },
      store: false,
    });
  });

  it("calls the injected createResponse exactly once and makes no real request", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await adapter.generate(createRequest());

    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it.each(["", " \n\t "])("rejects an empty model (%j)", (invalidModel) => {
    const createResponse = createResponseFake();

    expect(() =>
      createOpenAIGenerationAdapter({
        model: invalidModel,
        createResponse,
      }),
    ).toThrow(/model/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("rejects an empty message sequence", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generate(createRequest({ messages: [] })),
    ).rejects.toThrow(/instruction|message/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("rejects a sequence without an initial instruction", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generate(
        createRequest({
          messages: [
            {
              role: "user",
              content: "A user message cannot come first.",
            },
          ],
        }),
      ),
    ).rejects.toThrow(/first message|instruction/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("rejects a sequence containing only an instruction", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generate(
        createRequest({
          messages: [
            {
              role: "instruction",
              content: "An instruction needs a subsequent message.",
            },
          ],
        }),
      ),
    ).rejects.toThrow(/message|instruction/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("rejects multiple instruction messages", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generate(
        createRequest({
          messages: [
            {
              role: "instruction",
              content: "First instruction.",
            },
            {
              role: "user",
              content: "Valid user content.",
            },
            {
              role: "instruction",
              content: "Second instruction.",
            },
          ],
        }),
      ),
    ).rejects.toThrow(/only|exactly|instruction/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it.each([
    [
      "instruction",
      [
        { role: "instruction", content: " \n\t " },
        { role: "user", content: "Valid user content." },
      ] satisfies readonly ConversationMessage[],
    ],
    [
      "user",
      [
        { role: "instruction", content: "Valid instruction." },
        { role: "user", content: " \n\t " },
      ] satisfies readonly ConversationMessage[],
    ],
    [
      "assistant",
      [
        { role: "instruction", content: "Valid instruction." },
        { role: "assistant", content: " \n\t " },
      ] satisfies readonly ConversationMessage[],
    ],
  ])("rejects empty %s message content", async (_role, invalidMessages) => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generate(createRequest({ messages: invalidMessages })),
    ).rejects.toThrow(/content|message/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("rejects non-empty stopSequences instead of ignoring them", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(
      adapter.generate(
        createRequest({
          parameters: createGenerationParameters({
            sampling: {
              strategy: "temperature",
              temperature: 0.2,
            },
            maxOutputTokens: 1_200,
            stopSequences: ["</review>"],
          }),
        }),
      ),
    ).rejects.toThrow(/stop\s*sequences?/i);
    expect(createResponse).not.toHaveBeenCalled();
  });

  describe("generateStructured request validation", () => {
    it("rejects a sequence containing only an instruction before calling createResponse", async () => {
      const createResponse = createResponseFake();
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(
        adapter.generateStructured(
          createStructuredRequest({
            messages: [
              {
                role: "instruction",
                content: "An instruction needs a subsequent message.",
              },
            ],
          }),
        ),
      ).rejects.toThrow(/message|instruction/i);
      expect(createResponse).not.toHaveBeenCalled();
    });

    it("rejects an empty message before calling createResponse", async () => {
      const createResponse = createResponseFake();
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(
        adapter.generateStructured(
          createStructuredRequest({
            messages: [
              {
                role: "instruction",
                content: "Valid instruction.",
              },
              {
                role: "user",
                content: " \n\t ",
              },
            ],
          }),
        ),
      ).rejects.toThrow(/content|message/i);
      expect(createResponse).not.toHaveBeenCalled();
    });

    it("rejects non-empty stopSequences before calling createResponse", async () => {
      const createResponse = createResponseFake();
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(
        adapter.generateStructured(
          createStructuredRequest({
            parameters: createGenerationParameters({
              sampling: {
                strategy: "temperature",
                temperature: 0.2,
              },
              maxOutputTokens: 1_200,
              stopSequences: ["</review>"],
            }),
          }),
        ),
      ).rejects.toThrow(/stop\s*sequences?/i);
      expect(createResponse).not.toHaveBeenCalled();
    });
  });

  it("maps a completed response without exposing the raw provider response", async () => {
    const createResponse = createResponseFake();
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generate(createRequest());

    expect(response).toEqual({
      id: "resp_123",
      model,
      outputText: "Approve the change.",
      finishReason: "completed",
      usage: {
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
      },
    } satisfies GenerationResponse);
    expect(response).not.toHaveProperty("status");
    expect(response).not.toHaveProperty("providerOnlyField");
  });

  it("maps an incomplete max_output_tokens response with partial text", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
        output_text: "Partial review output",
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    const response = await adapter.generate(createRequest());

    expect(response.finishReason).toBe("max-output-tokens");
    expect(response.outputText).toBe("Partial review output");
  });

  it("maps an incomplete content_filter response with empty text", async () => {
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

    const response = await adapter.generate(createRequest());

    expect(response.finishReason).toBe("content-filter");
    expect(response.outputText).toBe("");
  });

  it("rejects an incomplete response with a missing reason", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        status: "incomplete",
        incomplete_details: null,
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(adapter.generate(createRequest())).rejects.toThrow(
      /incomplete|reason/i,
    );
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects an incomplete response with an unknown reason", async () => {
    const unknownIncompleteDetails = {
      reason: "unknown_reason",
    } as unknown as NonNullable<OpenAIResponseSnapshot["incomplete_details"]>;
    const createResponse = createResponseFake(
      createProviderResponse({
        status: "incomplete",
        incomplete_details: unknownIncompleteDetails,
      }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(adapter.generate(createRequest())).rejects.toThrow(
      /incomplete|reason/i,
    );
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it.each(["failed", "cancelled", "queued", "in_progress"] as const)(
    "rejects a response with status %s",
    async (status) => {
      const createResponse = createResponseFake(
        createProviderResponse({ status }),
      );
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(adapter.generate(createRequest())).rejects.toThrow(
        /status|response/i,
      );
      expect(createResponse).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects a response without usage", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({ usage: undefined }),
    );
    const adapter = createOpenAIGenerationAdapter({ model, createResponse });

    await expect(adapter.generate(createRequest())).rejects.toThrow(/usage/i);
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it.each(["", " \n\t "])(
    "rejects a completed response with empty output text (%j)",
    async (outputText) => {
      const createResponse = createResponseFake(
        createProviderResponse({ output_text: outputText }),
      );
      const adapter = createOpenAIGenerationAdapter({ model, createResponse });

      await expect(adapter.generate(createRequest())).rejects.toThrow(
        /output text|text/i,
      );
      expect(createResponse).toHaveBeenCalledTimes(1);
    },
  );

  it("preserves output_text and usage exactly without recalculation", async () => {
    const createResponse = createResponseFake(
      createProviderResponse({
        output_text: "  First line.\nSecond line.  ",
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

    const response = await adapter.generate(createRequest());

    expect(response.outputText).toBe("  First line.\nSecond line.  ");
    expect(response.usage).toEqual({
      inputTokens: 7,
      outputTokens: 11,
      totalTokens: 42,
    });
  });
});
