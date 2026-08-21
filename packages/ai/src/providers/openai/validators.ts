import type { GenerationRequest } from "../../generation/generation.js";
import type { ConversationMessage } from "../../generation/message-sequence.js";
import type { ToolDefinition } from "../../generation/tool-calling.js";
import type { OpenAIResponseSnapshot } from "./types.js";

export const validateGenerationRequest = (request: GenerationRequest): void => {
  validateMessages(request.messages);
  validateStopSequences(request.parameters.stopSequences);

  if (request.parameters.stopSequences.length > 0) {
    throw new RangeError(
      "OpenAI: stopSequences are not supported by this adapter.",
    );
  }
};

export const validateModel = (model: string): void => {
  if (!model?.trim()) {
    throw new Error("OpenAI: Model name cannot be empty.");
  }
};

export const validateSchemaName = (schemaName: string): void => {
  if (!schemaName.trim()) {
    throw new RangeError("OpenAI: Schema name cannot be empty.");
  }

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(schemaName)) {
    throw new RangeError(
      "OpenAI: Schema name must contain only letters, numbers, underscores, or hyphens and be at most 64 characters.",
    );
  }
};

export const containsRefusal = (response: OpenAIResponseSnapshot): boolean =>
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

export const validateTools = (tools: readonly ToolDefinition[]): void => {
  if (!Array.isArray(tools) || tools.length === 0) {
    throw new RangeError("OpenAI: at least one tool is required.");
  }

  const names = new Set<string>();

  for (const tool of tools) {
    validateTool(tool);

    if (names.has(tool.name)) {
      throw new RangeError(`OpenAI: duplicate tool name "${tool.name}".`);
    }

    names.add(tool.name);
  }
};

export const validateMaxToolRounds = (maxToolsNumbers: number) => {
  if (
    !maxToolsNumbers ||
    maxToolsNumbers < 0 ||
    !Number.isInteger(maxToolsNumbers) ||
    !Number.isFinite(maxToolsNumbers)
  ) {
    throw new RangeError("OpenAI: maxToolsNumber must be a positive integer.");
  }
};

export const validateTool = (tool: ToolDefinition) => {
  if (typeof tool.name !== "string" || !tool.name.trim()) {
    throw new Error("OpenAI: name is not valid");
  }
  if (typeof tool.description !== "string" || !tool.description.trim()) {
    throw new Error("OpenAI: description is not valid");
  }
  if (typeof tool.execute !== "function") {
    throw new Error("OpenAI: execute is not valid");
  }
};
