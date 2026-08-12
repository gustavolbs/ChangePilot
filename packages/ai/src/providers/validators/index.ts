import { ConversationMessage } from "../../labs/message-sequence.js";

export const validateModel = (model: string, provider: string): void => {
  if (!model?.trim()) {
    throw new Error(`${provider}: Model name cannot be empty.`);
  }
};

export const validateMessages = (
  messages: readonly ConversationMessage[],
  provider: string,
): void => {
  messages.forEach((m) => {
    if (!m.content.trim() || !m.role.trim()) {
      throw new RangeError(`${provider}: message and role cannot be empty`);
    }
  });
};

export const validateStopSequences = (stopSequences: readonly string[]) => {
  if (!Array.isArray(stopSequences)) {
    throw new RangeError("Stop sequences must be an array.");
  }

  for (const sequence of stopSequences) {
    if (typeof sequence !== "string" || !sequence.trim()) {
      throw new RangeError("Stop sequences must be non-empty strings.");
    }
  }
};
