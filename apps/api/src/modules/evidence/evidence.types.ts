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

export interface EvidenceStore {
  reindexFromFixtures(rootPath: string): { documentCount: number; sourcePath: string };
  search(query: string, maxResults: number): EvidenceSearchResult[];
  getDocumentCount(): number;
  getIndexPath(): string;
}
