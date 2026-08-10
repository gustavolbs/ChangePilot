export type InstructionMessage = Readonly<{
  role: "instruction";
  content: string;
}>;

export type UserMessage = Readonly<{
  role: "user";
  content: string;
}>;

export type AssistantMessage = Readonly<{
  role: "assistant";
  content: string;
}>;

export type ConversationMessage =
  | InstructionMessage
  | UserMessage
  | AssistantMessage;

export type ConversationTurn = Readonly<{
  userMessage: string;
  assistantMessage: string;
}>;

export const createMessageSequence = (
  instruction: string,
  history: readonly ConversationTurn[],
  currentUserMessage: string,
): readonly ConversationMessage[] => {
  if (!instruction.trim()) {
    throw new RangeError("Instruction must be a non-empty string.");
  }

  if (!currentUserMessage.trim()) {
    throw new RangeError("Current user message must be a non-empty string.");
  }

  const sequence: ConversationMessage[] = [
    {
      role: "instruction",
      content: instruction,
    },
  ];

  for (const turn of history) {
    if (!turn.userMessage.trim() || !turn.assistantMessage.trim()) {
      throw new RangeError("Historical messages must be non-empty strings.");
    }

    sequence.push(
      {
        role: "user",
        content: turn.userMessage,
      },
      {
        role: "assistant",
        content: turn.assistantMessage,
      },
    );
  }

  sequence.push({
    role: "user",
    content: currentUserMessage,
  });

  return sequence;
};
