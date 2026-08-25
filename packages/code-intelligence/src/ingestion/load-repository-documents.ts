import fs from "node:fs/promises";
import path from "node:path";

import {
  createRepositoryDocument,
  type RepositoryDocument,
} from "../repositories/repository-document.js";
import { discoverRepositoryFilePaths } from "./discover-repository-files.js";

export const MAX_REPOSITORY_DOCUMENT_SIZE_BYTES = 1_048_576;

const MAX_REPOSITORY_DOCUMENT_READ_BYTES =
  MAX_REPOSITORY_DOCUMENT_SIZE_BYTES + 1;

const decodeUtf8 = (bytes: Uint8Array): string | undefined => {
  try {
    return new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }

    throw error;
  }
};

export const loadRepositoryDocuments = async (
  rootPath: string,
): Promise<readonly RepositoryDocument[]> => {
  const relativePaths = await discoverRepositoryFilePaths(rootPath);
  const documents: RepositoryDocument[] = [];

  for (const relativePath of relativePaths) {
    const filePath = path.join(rootPath, ...relativePath.split("/"));
    const fileHandle = await fs.open(filePath, "r");

    try {
      const stats = await fileHandle.stat();

      if (!stats.isFile() || stats.size > MAX_REPOSITORY_DOCUMENT_SIZE_BYTES) {
        continue;
      }

      const buffer = Buffer.allocUnsafe(MAX_REPOSITORY_DOCUMENT_READ_BYTES);
      let totalBytesRead = 0;

      while (totalBytesRead < buffer.length) {
        const { bytesRead } = await fileHandle.read(
          buffer,
          totalBytesRead,
          buffer.length - totalBytesRead,
          null,
        );

        if (bytesRead === 0) {
          break;
        }

        totalBytesRead += bytesRead;
      }

      if (totalBytesRead > MAX_REPOSITORY_DOCUMENT_SIZE_BYTES) {
        continue;
      }

      const bytes = buffer.subarray(0, totalBytesRead);

      if (bytes.includes(0)) {
        continue;
      }

      const content = decodeUtf8(bytes);

      if (content === undefined) {
        continue;
      }

      documents.push(createRepositoryDocument(relativePath, content));
    } finally {
      await fileHandle.close();
    }
  }

  return documents;
};
