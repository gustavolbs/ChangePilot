import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverRepositoryFilePaths } from "./discover-repository-files.js";

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "changepilot-discovery-"),
  );

  temporaryDirectories.push(directory);
  return directory;
};

const createFile = async (
  rootPath: string,
  relativePath: string,
): Promise<void> => {
  const filePath = path.join(rootPath, ...relativePath.split("/"));

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "fixture");
};

afterEach(async () => {
  const directories = temporaryDirectories.splice(0);

  await Promise.all(
    directories.map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("discoverRepositoryFilePaths", () => {
  it("discovers a regular file in the repository root", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "README.md");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "README.md",
    ]);
  });

  it("discovers files across multiple directory levels", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "src/index.ts");
    await createFile(rootPath, "src/features/review/create-review.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "src/features/review/create-review.ts",
      "src/index.ts",
    ]);
  });

  it("returns paths relative to the repository root", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "src/index.ts");

    const [filePath] = await discoverRepositoryFilePaths(rootPath);

    expect(filePath).toBe("src/index.ts");
    expect(path.isAbsolute(filePath ?? "")).toBe(false);
  });

  it("uses the portable logical separator", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "src/features/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "src/features/index.ts",
    ]);
  });

  it("sorts the complete result lexicographically", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "z-last.ts");
    await createFile(rootPath, "src/z-nested.ts");
    await createFile(rootPath, "a-first.ts");
    await createFile(rootPath, "docs/middle.md");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "a-first.ts",
      "docs/middle.md",
      "src/z-nested.ts",
      "z-last.ts",
    ]);
  });

  it("does not include directories in the result", async () => {
    const rootPath = await createTemporaryDirectory();
    await fs.mkdir(path.join(rootPath, "empty-directory"));
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "src/index.ts",
    ]);
  });

  it("returns an empty list for an empty directory", async () => {
    const rootPath = await createTemporaryDirectory();

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([]);
  });

  it("ignores a symbolic link to a file", async () => {
    const rootPath = await createTemporaryDirectory();
    const targetRootPath = await createTemporaryDirectory();
    const targetPath = path.join(targetRootPath, "target.ts");
    await fs.writeFile(targetPath, "target");
    await fs.symlink(targetPath, path.join(rootPath, "linked.ts"), "file");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([]);
  });

  it("ignores a symbolic link to a directory", async () => {
    const rootPath = await createTemporaryDirectory();
    const targetRootPath = await createTemporaryDirectory();
    await createFile(targetRootPath, "nested/index.ts");
    await fs.symlink(
      targetRootPath,
      path.join(rootPath, "linked-directory"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([]);
  });

  it.each(["", "   ", "\t\n"])(
    "rejects the empty root path %j",
    async (rootPath) => {
      await expect(discoverRepositoryFilePaths(rootPath)).rejects.toThrow(
        RangeError,
      );
    },
  );

  it("propagates the native error for a missing root", async () => {
    const parentPath = await createTemporaryDirectory();
    const missingRootPath = path.join(parentPath, "missing");

    await expect(
      discoverRepositoryFilePaths(missingRootPath),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("demonstrates that ignore rules are not applied yet", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".git/config");
    await createFile(rootPath, "node_modules/example/index.js");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".git/config",
      "node_modules/example/index.js",
      "src/index.ts",
    ]);
  });
});
