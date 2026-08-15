export type GenerationStatus =
  | "idle"
  | "streaming"
  | "completed"
  | "cancelled"
  | "error";

export type ReviewStreamEvent =
  | Readonly<{
      type: "text-delta";
      delta: string;
    }>
  | Readonly<{
      type: "finished";
    }>
  | Readonly<{
      type: "error";
      message: string;
    }>;

export type ReviewGenerationState = Readonly<{
  status: GenerationStatus;
  output: string;
  error: string | null;
}>;

export type ReviewGenerationAction =
  | Readonly<{ type: "start" }>
  | ReviewStreamEvent
  | Readonly<{ type: "cancelled" }>;

export const initialReviewGenerationState: ReviewGenerationState = {
  status: "idle",
  output: "",
  error: null,
};

export const reduceReviewGeneration = (
  state: ReviewGenerationState,
  action: ReviewGenerationAction,
): ReviewGenerationState => {
  switch (action.type) {
    case "start":
      return {
        status: "streaming",
        output: "",
        error: null,
      };

    case "text-delta":
      return {
        ...state,
        output: state.output + action.delta,
      };

    case "finished":
      return {
        ...state,
        status: "completed",
      };

    case "cancelled":
      return {
        ...state,
        status: "cancelled",
      };

    case "error":
      return {
        ...state,
        status: "error",
        error: action.message,
      };
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseReviewStreamEvent = (data: string): ReviewStreamEvent => {
  let value: unknown;

  try {
    value = JSON.parse(data);
  } catch {
    throw new Error("Invalid review stream payload.");
  }

  if (!isRecord(value)) {
    throw new Error("Invalid review stream event.");
  }

  switch (value.type) {
    case "text-delta":
      if (typeof value.delta !== "string") {
        throw new Error("Invalid text-delta event.");
      }

      return {
        type: "text-delta",
        delta: value.delta,
      };

    case "finished":
      return {
        type: "finished",
      };

    case "error":
      if (typeof value.message !== "string") {
        throw new Error("Invalid error event.");
      }

      return {
        type: "error",
        message: value.message,
      };

    default:
      throw new Error("Unknown review stream event.");
  }
};

const readFrameData = (frame: string): string =>
  frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");

export const readReviewStream = async (
  response: Response,
  onEvent: (event: ReviewStreamEvent) => void,
): Promise<void> => {
  if (!response.body) {
    throw new Error("Response body is not defined.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedTerminalEvent = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      if (!receivedTerminalEvent) {
        throw new Error(
          "The connection was closed before finishing the stream.",
        );
      }

      return;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replaceAll("\r\n", "\n");

    let boundary = buffer.indexOf("\n\n");

    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = readFrameData(frame);

      if (!data) {
        throw new Error("No data found for this stream.");
      }

      const event = parseReviewStreamEvent(data);
      onEvent(event);

      if (event.type === "finished" || event.type === "error") {
        receivedTerminalEvent = true;
      }

      boundary = buffer.indexOf("\n\n");
    }
  }
};

export const getReviewStreamErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "An unknown streaming error occurred.";
