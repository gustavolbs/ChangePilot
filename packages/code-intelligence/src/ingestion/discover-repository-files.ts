import fs from "node:fs/promises";
import path from "node:path";

export const discoverRepositoryFilePaths = async (
  rootPath: string,
): Promise<readonly string[]> => {
  if (!rootPath.trim()) {
    throw new RangeError("Invalid rootPath provided.");
  }

  const filePaths: string[] = [];

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

      if (entry.isDirectory()) {
        await visitDirectory(absolutePath, relativePath);
      } else if (entry.isFile()) {
        filePaths.push(relativePath);
      }
    }
  };

  await visitDirectory(rootPath, "");

  return filePaths.sort();
};
