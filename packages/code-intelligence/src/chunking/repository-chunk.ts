export type RepositoryChunk = Readonly<{
  path: string;
  index: number;
  content: string;
}>;
