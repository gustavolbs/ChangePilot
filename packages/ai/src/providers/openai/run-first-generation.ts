import OpenAI from "openai";

const runFirstGeneration = async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }

  if (!model?.trim()) {
    throw new Error("OPENAI_MODEL environment variable is not set.");
  }

  const client = new OpenAI({ apiKey: apiKey });

  const request = {
    model,
    input: "Write a one-sentence bedtime story about a unicorn.",
  };

  console.log("Request:", request);

  const response = await client.responses.create(request);

  if (response.status === "completed") {
    const summary = {
      id: response.id,
      model: response.model,
      status: response.status,
      outputText: response.output_text,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      totalTokens: response.usage?.total_tokens,
    };

    console.log(JSON.stringify(summary, null, 2));
  }
};

runFirstGeneration();
