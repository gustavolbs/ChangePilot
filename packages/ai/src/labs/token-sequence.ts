export type TokenPiece = Readonly<{
  id: number;
  piece: string;
}>;

export type TokenSequence = Readonly<{
  text: string;
  tokens: readonly TokenPiece[];
  tokenIds: readonly number[];
  tokenCount: number;
  reconstructedText: string;
}>;

export const createTokenSequence = (
  text: string,
  tokens: readonly TokenPiece[],
): TokenSequence => {
  const reconstructedText = tokens.map((token) => token.piece).join("");
  if (reconstructedText !== text) {
    throw new Error("Reconstructed text does not match the original text.");
  }

  return {
    text,
    tokens,
    tokenIds: tokens.map((token) => token.id),
    tokenCount: tokens.length,
    reconstructedText,
  };
};
