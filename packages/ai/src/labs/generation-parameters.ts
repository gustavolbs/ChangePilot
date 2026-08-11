export type TemperatureSampling = Readonly<{
  strategy: "temperature";
  temperature: number;
}>;

export type TopPSampling = Readonly<{
  strategy: "top-p";
  topP: number;
}>;

export type SamplingParameters = TemperatureSampling | TopPSampling;

export type GenerationParametersInput = Readonly<{
  sampling: SamplingParameters;
  maxOutputTokens: number;
  stopSequences: readonly string[];
}>;

export type GenerationParameters = Readonly<{
  sampling: SamplingParameters;
  maxOutputTokens: number;
  stopSequences: readonly string[];
}>;

export const createGenerationParameters = (
  input: GenerationParametersInput,
): GenerationParameters => {
  validateSampling(input.sampling);
  validateMaxOutputTokens(input.maxOutputTokens);
  validateStopSequences(input.stopSequences);

  const sampling: SamplingParameters = { ...input.sampling };
  const maxOutputTokens: number = input.maxOutputTokens;
  const stopSequences: readonly string[] = [...input.stopSequences];

  return {
    sampling,
    maxOutputTokens,
    stopSequences,
  };
};

const validateSampling = (sampling: SamplingParameters) => {
  if (!sampling.strategy.trim()) {
    throw new RangeError("Sampling strategy cannot be empty.");
  }

  if (sampling.strategy === "temperature") {
    if (
      sampling.temperature < 0 ||
      sampling.temperature > 2 ||
      !Number.isFinite(sampling.temperature)
    ) {
      throw new RangeError(
        "Temperature must be a finite number between 0 and 2.",
      );
    }
  }

  if (sampling.strategy === "top-p") {
    if (
      sampling.topP <= 0 ||
      sampling.topP > 1 ||
      !Number.isFinite(sampling.topP)
    ) {
      throw new RangeError(
        "Top-P must be a finite number greater than 0 and less than or equal to 1.",
      );
    }
  }
};

const validateMaxOutputTokens = (maxOutputTokens: number) => {
  if (
    maxOutputTokens <= 0 ||
    !Number.isInteger(maxOutputTokens) ||
    !Number.isFinite(maxOutputTokens)
  ) {
    throw new RangeError(
      "Max output tokens must be a positive integer greater than 0.",
    );
  }
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
