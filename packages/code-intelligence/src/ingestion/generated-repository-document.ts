import path from "node:path";

import type { RepositoryDocument } from "../repositories/repository-document.js";

const GENERATED_PATH_SEGMENT = ".generated.";
const GENERATED_PATH_SUFFIX = ".generated";
const HEADER_LINE_LIMIT = 20;
const GENERATED_HEADER_MARKER = "@generated";
const GENERATED_PHRASES = [
  "code generated",
  "automatically generated",
  "auto-generated",
] as const;
const DO_NOT_EDIT_PHRASE = "do not edit";

const hasGeneratedBasename = (documentPath: string): boolean => {
  const basename = path.posix.basename(documentPath).toLowerCase();

  return (
    basename.includes(GENERATED_PATH_SEGMENT) ||
    basename.endsWith(GENERATED_PATH_SUFFIX)
  );
};

const hasGeneratedHeader = (content: string): boolean => {
  const headerLines = content.split(/\r\n|\n|\r/).slice(0, HEADER_LINE_LIMIT);

  return headerLines.some((line) => {
    const normalizedLine = line.toLowerCase();

    if (normalizedLine.includes(GENERATED_HEADER_MARKER)) {
      return true;
    }

    return (
      normalizedLine.includes(DO_NOT_EDIT_PHRASE) &&
      GENERATED_PHRASES.some((phrase) => normalizedLine.includes(phrase))
    );
  });
};

export const isGeneratedRepositoryDocument = (
  document: RepositoryDocument,
): boolean =>
  hasGeneratedBasename(document.path) || hasGeneratedHeader(document.content);
