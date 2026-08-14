export interface DocumentChunk {
  id: string;
  source: string;
  page: number;
  text: string;
  embedding?: number[];
  termFrequencies?: Record<string, number>;
}

export interface IndexedDocument {
  name: string;
  chunksCount: number;
  totalCharacters: number;
  addedAt: string;
}

export interface SourceCitation {
  source: string;
  page: number;
  snippet: string;
  fullText: string;
  score: number;
}

export interface QueryResponse {
  query: string;
  answer: string;
  sources: SourceCitation[];
  modelUsed: string;
  latencyMs: number;
  session_id: string;
}

export interface IngestResponse {
  status: "success" | "error" | "warning";
  message?: string;
  processedFiles: string[];
  totalChunks: number;
  documentsCount: number;
}

export interface SessionStats {
  session_id: string;
  totalDocuments: number;
  totalChunks: number;
  files: string[];
  embeddingType: string;
  llmModel: string;
}
