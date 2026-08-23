export type EmbeddingVector = Readonly<{
  values: readonly number[];
  dimensions: number;
}>;

export const createEmbeddingVector = (
  values: readonly number[],
): EmbeddingVector => {
  if (!values.length) {
    throw new RangeError("Empty vector");
  }
  values.forEach((element) => {
    if (!Number.isFinite(element)) {
      throw new RangeError("Invalid vector value");
    }
  });

  return {
    dimensions: values.length,
    values: [...values],
  };
};
