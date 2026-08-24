export type RepositoryDocument = Readonly<{
  path: string;
  content: string;
}>;

export const createRepositoryDocument = (
  path: string,
  content: string,
): RepositoryDocument => {
  if (!path.trim()) {
    throw new RangeError("Invalid path provided.");
  }

  return {
    path,
    content,
  };
};
