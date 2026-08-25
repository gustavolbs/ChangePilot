import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  loadRepositoryDocuments,
  MAX_REPOSITORY_DOCUMENT_SIZE_BYTES,
} from "./load-repository-documents.js";

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "changepilot-document-loading-"),
  );

  temporaryDirectories.push(directory);
  return directory;
};

const createFile = async (
  rootPath: string,
  relativePath: string,
  content: string | Uint8Array = "",
): Promise<void> => {
  const filePath = path.join(rootPath, ...relativePath.split("/"));

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
};

afterEach(async () => {
  const directories = temporaryDirectories.splice(0);

  await Promise.all(
    directories.map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("loadRepositoryDocuments", () => {
  it("loads a textual file from the repository root", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "README.md", "ChangePilot");

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: "README.md",
        content: "ChangePilot",
      },
    ]);
  });

  it("loads files from nested directories", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "src/features/review/index.ts", "export {};\n");

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: "src/features/review/index.ts",
        content: "export {};\n",
      },
    ]);
  });

  it("preserves portable repository-relative paths", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "packages/example/src/index.ts", "content");

    const [document] = await loadRepositoryDocuments(rootPath);

    expect(document?.path).toBe("packages/example/src/index.ts");
    expect(path.isAbsolute(document?.path ?? "")).toBe(false);
  });

  it("preserves whitespace and line breaks exactly", async () => {
    const rootPath = await createTemporaryDirectory();
    const content = "  first line\n\n\tsecond line  \r\n";
    await createFile(rootPath, "notes.txt", content);

    const [document] = await loadRepositoryDocuments(rootPath);

    expect(document?.content).toBe(content);
  });

  it("preserves valid Unicode text", async () => {
    const rootPath = await createTemporaryDirectory();
    const content = "Revisão: mudança válida ✅ — 日本語\n";
    await createFile(rootPath, "unicode.txt", content);

    const [document] = await loadRepositoryDocuments(rootPath);

    expect(document?.content).toBe(content);
  });

  it("preserves a UTF-8 BOM as U+FEFF", async () => {
    const rootPath = await createTemporaryDirectory();
    const content = "\uFEFFexport const value = 1;\n";
    await createFile(rootPath, "with-bom.ts", Buffer.from(content, "utf8"));

    const [document] = await loadRepositoryDocuments(rootPath);

    expect(document?.content).toBe(content);
    expect(document?.content.codePointAt(0)).toBe(0xfeff);
  });

  it("creates a document for an empty file", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "empty.txt");

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: "empty.txt",
        content: "",
      },
    ]);
  });

  it("accepts a file with exactly the maximum number of bytes", async () => {
    const rootPath = await createTemporaryDirectory();
    const content = "a".repeat(MAX_REPOSITORY_DOCUMENT_SIZE_BYTES);
    await createFile(rootPath, "maximum.txt", content);

    const [document] = await loadRepositoryDocuments(rootPath);

    expect(document?.path).toBe("maximum.txt");
    expect(document?.content).toBe(content);
    expect(Buffer.byteLength(document?.content ?? "", "utf8")).toBe(
      MAX_REPOSITORY_DOCUMENT_SIZE_BYTES,
    );
  });

  it("rejects a file one byte above the maximum size", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(
      rootPath,
      "too-large.txt",
      Buffer.alloc(MAX_REPOSITORY_DOCUMENT_SIZE_BYTES + 1, 0x61),
    );

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([]);
  });

  it("calculates the limit by bytes instead of character count", async () => {
    const rootPath = await createTemporaryDirectory();
    const content = "é".repeat(MAX_REPOSITORY_DOCUMENT_SIZE_BYTES / 2 + 1);
    expect(content.length).toBeLessThan(MAX_REPOSITORY_DOCUMENT_SIZE_BYTES);
    expect(Buffer.byteLength(content, "utf8")).toBeGreaterThan(
      MAX_REPOSITORY_DOCUMENT_SIZE_BYTES,
    );
    await createFile(rootPath, "multibyte.txt", content);

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([]);
  });

  it("rejects content containing a NUL byte", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(
      rootPath,
      "binary.dat",
      Buffer.from([0x74, 0x65, 0x00, 0x78, 0x74]),
    );

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([]);
  });

  it("rejects an invalid UTF-8 sequence", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "invalid.txt", Buffer.from([0xc3, 0x28]));

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([]);
  });

  it("does not replace invalid UTF-8 bytes with U+FFFD", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "invalid.txt", Buffer.from([0x61, 0x80, 0x62]));
    await createFile(rootPath, "valid.txt", "accepted");

    const documents = await loadRepositoryDocuments(rootPath);

    expect(documents).toEqual([
      {
        path: "valid.txt",
        content: "accepted",
      },
    ]);
    expect(documents.some(({ content }) => content.includes("\uFFFD"))).toBe(
      false,
    );
  });

  it("preserves discovery order between normal documents when generated documents are omitted", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "z-last.txt", "last");
    await createFile(rootPath, "src/middle.txt", "middle");
    await createFile(rootPath, "m-client.generated.ts", "generated");
    await createFile(rootPath, "a-first.txt", "first");

    const documents = await loadRepositoryDocuments(rootPath);

    expect(documents.map(({ path }) => path)).toEqual([
      "a-first.txt",
      "src/middle.txt",
      "z-last.txt",
    ]);
  });

  it("returns only accepted documents from a mixed candidate set", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "accepted.txt", "accepted");
    await createFile(rootPath, "binary.dat", Buffer.from([0x00]));
    await createFile(rootPath, "empty.txt");
    await createFile(rootPath, "invalid.txt", Buffer.from([0xff]));
    await createFile(
      rootPath,
      "too-large.txt",
      Buffer.alloc(MAX_REPOSITORY_DOCUMENT_SIZE_BYTES + 1, 0x61),
    );

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: "accepted.txt",
        content: "accepted",
      },
      {
        path: "empty.txt",
        content: "",
      },
    ]);
  });

  it("integrates structural exclusions and the root .gitignore", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "ignored.txt\n");
    await createFile(rootPath, ".git/config", "excluded");
    await createFile(rootPath, "ignored.txt", "excluded");
    await createFile(rootPath, "node_modules/package/index.js", "excluded");
    await createFile(rootPath, "src/index.ts", "accepted");

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: ".gitignore",
        content: "ignored.txt\n",
      },
      {
        path: "src/index.ts",
        content: "accepted",
      },
    ]);
  });

  it("does not load symbolic links omitted by discovery", async () => {
    const rootPath = await createTemporaryDirectory();
    const targetRootPath = await createTemporaryDirectory();
    const targetPath = path.join(targetRootPath, "external.txt");
    await fs.writeFile(targetPath, "external");
    await fs.symlink(targetPath, path.join(rootPath, "linked.txt"), "file");
    await createFile(rootPath, "source.txt", "source");

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: "source.txt",
        content: "source",
      },
    ]);
  });

  it("propagates ENOENT for a missing repository root", async () => {
    const parentPath = await createTemporaryDirectory();
    const missingRootPath = path.join(parentPath, "missing");

    await expect(
      loadRepositoryDocuments(missingRootPath),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("omits a document with a generated basename", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(
      rootPath,
      "src/client.generated.ts",
      "export const generated = true;\n",
    );

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([]);
  });

  it("omits a document with @generated in its header", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(
      rootPath,
      "src/client.ts",
      "// @generated by a tool\nexport {};\n",
    );

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([]);
  });

  it("omits a document with a strong generated header", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(
      rootPath,
      "src/schema.ts",
      "// Code generated by a tool. DO NOT EDIT.\nexport {};\n",
    );

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([]);
  });

  it("still loads a regular file inside a generated directory", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "generated/client.ts", "export {};\n");

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: "generated/client.ts",
        content: "export {};\n",
      },
    ]);
  });

  it("still loads pnpm-lock.yaml without a generated marker", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");

    await expect(loadRepositoryDocuments(rootPath)).resolves.toEqual([
      {
        path: "pnpm-lock.yaml",
        content: "lockfileVersion: '9.0'\n",
      },
    ]);
  });
});
