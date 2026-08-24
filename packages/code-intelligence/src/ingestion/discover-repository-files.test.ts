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
  content = "fixture",
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

describe("discoverRepositoryFilePaths", () => {
  it("discovers a regular file in the repository root", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "README.md");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "README.md",
    ]);
  });

  it("does not fail when the root .gitignore is absent", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "src/index.ts",
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

  it("always excludes .git and all of its descendants", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".git/config");
    await createFile(rootPath, ".git/objects/ab/object");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "src/index.ts",
    ]);
  });

  it("always excludes node_modules at the root and in nested directories", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "node_modules/package/index.js");
    await createFile(
      rootPath,
      "packages/example/node_modules/package/index.js",
    );
    await createFile(rootPath, "packages/example/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "packages/example/index.ts",
    ]);
  });

  it("applies wildcard rules to matching files", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "*.log\n");
    await createFile(rootPath, "application.log");
    await createFile(rootPath, "logs/debug.log");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "src/index.ts",
    ]);
  });

  it("prunes directories matched by a directory rule", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "dist/\n");
    await createFile(rootPath, "dist/index.js");
    await createFile(rootPath, "dist/assets/application.js");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "src/index.ts",
    ]);
  });

  it("applies root-anchored rules only at the root", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "/root-only.txt\n");
    await createFile(rootPath, "root-only.txt");
    await createFile(rootPath, "nested/root-only.txt");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "nested/root-only.txt",
    ]);
  });

  it("applies globstar rules at multiple directory levels", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "**/*.generated.ts\n");
    await createFile(rootPath, "root.generated.ts");
    await createFile(rootPath, "src/feature.generated.ts");
    await createFile(rootPath, "packages/example/deep/file.generated.ts");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "src/index.ts",
    ]);
  });

  it("allows a negation to reinclude a regular file", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "*.log\n!important.log\n");
    await createFile(rootPath, "debug.log");
    await createFile(rootPath, "important.log");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "important.log",
    ]);
  });

  it("does not treat comments and empty lines as ignore rules", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "# This is a comment.\n\n   \n");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "src/index.ts",
    ]);
  });

  it("matches .gitignore rules case-sensitively", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "*.log\n");
    await createFile(rootPath, "debug.log");
    await createFile(rootPath, "server.LOG");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "server.LOG",
    ]);
  });

  it("does not allow negations to reinclude structural exclusions", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(
      rootPath,
      ".gitignore",
      "!.git/config\n!node_modules/package/index.js\n",
    );
    await createFile(rootPath, ".git/config");
    await createFile(rootPath, "node_modules/package/index.js");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
      "src/index.ts",
    ]);
  });

  it("includes the root .gitignore as a candidate by default", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", "# No exclusions.\n");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      ".gitignore",
    ]);
  });

  it("allows a valid rule to exclude the root .gitignore", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, ".gitignore", ".gitignore\n");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "src/index.ts",
    ]);
  });

  it("treats nested .gitignore files as candidates without applying their rules", async () => {
    const rootPath = await createTemporaryDirectory();
    await createFile(rootPath, "nested/.gitignore", "*.ts\n");
    await createFile(rootPath, "nested/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "nested/.gitignore",
      "nested/index.ts",
    ]);
  });

  it("ignores a symbolic link to a file", async () => {
    const rootPath = await createTemporaryDirectory();
    const targetRootPath = await createTemporaryDirectory();
    const targetPath = path.join(targetRootPath, "target.ts");
    await fs.writeFile(targetPath, "target");
    await fs.symlink(targetPath, path.join(rootPath, "linked.ts"), "file");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([]);
  });

  it("does not follow a symbolic root .gitignore", async () => {
    const rootPath = await createTemporaryDirectory();
    const targetRootPath = await createTemporaryDirectory();
    const targetPath = path.join(targetRootPath, "external.gitignore");
    await fs.writeFile(targetPath, "*.ts\n");
    await fs.symlink(targetPath, path.join(rootPath, ".gitignore"), "file");
    await createFile(rootPath, "src/index.ts");

    await expect(discoverRepositoryFilePaths(rootPath)).resolves.toEqual([
      "src/index.ts",
    ]);
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

  it("propagates .gitignore read errors other than ENOENT", async () => {
    const rootPath = await createTemporaryDirectory();
    await fs.mkdir(path.join(rootPath, ".gitignore"));

    await expect(discoverRepositoryFilePaths(rootPath)).rejects.toMatchObject({
      code: "EISDIR",
    });
  });
});
