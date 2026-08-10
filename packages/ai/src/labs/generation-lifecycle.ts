type ApplicationInput = Readonly<{
  objective: string;
  evidence: string;
}>;

type LifecycleEvent =
  | {
      type: "application-input";
      responsible: "application";
      input: ApplicationInput;
    }
  | {
      type: "request-serialization";
      responsible: "client-boundary";
      serializedRequest: string;
    }
  | {
      type: "provider-api";
      responsible: "provider-service";
      receivedRequest: string;
    }
  | {
      type: "tokenization";
      responsible: "model-runtime";
      tokenizationInput: string;
    }
  | {
      type: "generation";
      responsible: "model-runtime";
      generatedOutput: string;
    }
  | {
      type: "response-serialization";
      responsible: "provider-service";
      serializedResponse: string;
    }
  | {
      type: "application-consumption";
      responsible: "application";
      output: string;
    };

export const createGenerationLifecycleTrace = (
  applicationInput: ApplicationInput,
  modelOutput: string,
): readonly LifecycleEvent[] => {
  const serializedRequest = JSON.stringify({
    input: applicationInput,
  });

  const serializedResponse = JSON.stringify({
    output: modelOutput,
  });

  return [
    {
      type: "application-input",
      responsible: "application",
      input: applicationInput,
    },
    {
      type: "request-serialization",
      responsible: "client-boundary",
      serializedRequest,
    },
    {
      type: "provider-api",
      responsible: "provider-service",
      receivedRequest: serializedRequest,
    },
    {
      type: "tokenization",
      responsible: "model-runtime",
      tokenizationInput: serializedRequest,
    },
    {
      type: "generation",
      responsible: "model-runtime",
      generatedOutput: modelOutput,
    },
    {
      type: "response-serialization",
      responsible: "provider-service",
      serializedResponse,
    },
    {
      type: "application-consumption",
      responsible: "application",
      output: modelOutput,
    },
  ];
};
