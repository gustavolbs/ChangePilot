import fs from "node:fs/promises";
import path from "node:path";
import createIgnore from "ignore";

const isErrorWithCode = (error: unknown, code: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === code;

const readRootGitIgnore = async (rootPath: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(rootPath, ".gitignore"), "utf8");
  } catch (error) {
    if (isErrorWithCode(error, "ENOENT")) {
      return "";
    }

    throw error;
  }
};

const EXCLUDED_PATHS = [".git", "node_modules"];
const isStructurallyIgnored = (entryName: string): boolean => {
  return EXCLUDED_PATHS.includes(entryName);
};

export const discoverRepositoryFilePaths = async (
  rootPath: string,
): Promise<readonly string[]> => {
  if (!rootPath.trim()) {
    throw new RangeError("Invalid rootPath provided.");
  }

  const filePaths: string[] = [];
  const gitIgnore = createIgnore({ ignorecase: false }).add(
    await readRootGitIgnore(rootPath),
  );

  const visitDirectory = async (
    absoluteDirectory: string,
    relativeDirectory: string,
  ): Promise<void> => {
    const entries = await fs.readdir(absoluteDirectory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const relativePath = path.posix.join(relativeDirectory, entry.name);

      if (
        (!entry.isDirectory() && !entry.isFile()) ||
        isStructurallyIgnored(entry.name)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        if (gitIgnore.ignores(`${relativePath}/`)) {
          continue;
        }

        await visitDirectory(absolutePath, relativePath);
      } else if (!gitIgnore.ignores(relativePath)) {
        filePaths.push(relativePath);
      }
    }
  };

  await visitDirectory(rootPath, "");

  return filePaths.sort();
};
