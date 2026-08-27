import type { RepositoryDocument } from "../repositories/repository-document.js";
import type { RepositoryChunk } from "./repository-chunk.js";

export type FixedSizeRepositoryChunkingOptions = Readonly<{
  chunkSize: number;
  chunkOverlap: number;
}>;

const validateOptions = ({
  chunkSize,
  chunkOverlap,
}: FixedSizeRepositoryChunkingOptions): void => {
  if (
    !Number.isFinite(chunkSize) ||
    !Number.isInteger(chunkSize) ||
    chunkSize <= 0
  ) {
    throw new RangeError("Invalid chunkSize provided.");
  }

  if (
    !Number.isFinite(chunkOverlap) ||
    !Number.isInteger(chunkOverlap) ||
    chunkOverlap < 0 ||
    chunkOverlap >= chunkSize
  ) {
    throw new RangeError("Invalid chunkOverlap provided.");
  }
};

export const chunkRepositoryDocumentByFixedSize = (
  document: RepositoryDocument,
  options: FixedSizeRepositoryChunkingOptions,
): readonly RepositoryChunk[] => {
  validateOptions(options);

  const codePoints = Array.from(document.content);

  if (codePoints.length === 0) {
    return [];
  }

  const chunks: RepositoryChunk[] = [];
  const step = options.chunkSize - options.chunkOverlap;
  let start = 0;

  while (start < codePoints.length) {
    const end = Math.min(start + options.chunkSize, codePoints.length);

    chunks.push({
      path: document.path,
      index: chunks.length,
      content: codePoints.slice(start, end).join(""),
    });

    if (end === codePoints.length) {
      break;
    }

    start += step;
  }

  return chunks;
};
