export interface EvidenceDocument {
  id: string;
  sourcePath: string;
  sourceType: string;
  chunkText: string;
  entityTags: string[];
}

export interface EvidenceSearchResult {
  id: string;
  sourcePath: string;
  sourceType: string;
  chunkText: string;
  entityTags: string[];
  score: number;
}

export interface EvidenceSearchOptions {
  sourcePathPrefixes?: string[];
  sourcePathEquals?: string[];
}

export interface EvidenceStore {
  reindexFromFixtures(rootPath: string): { documentCount: number; sourcePath: string };
  search(query: string, maxResults: number, options?: EvidenceSearchOptions): EvidenceSearchResult[];
  listBySourcePath(sourcePath: string, maxResults: number): EvidenceSearchResult[];
  getDocumentCount(): number;
  getIndexPath(): string;
}
