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
  denseRank?: number;
  sparseRank?: number;
  rrfScore?: number;
  rerankScore?: number;
  cragGrade?: "RELEVANT" | "PARTIALLY_RELEVANT" | "IRRELEVANT";
  cragScore?: number;
  matchedKeywords?: string[];
}

export interface CRAGStats {
  totalRetrieved: number;
  relevantCount: number;
  filteredCount: number;
  retrievalConfidence: number;
}

export interface SelfRAGResult {
  groundingScore: number;
  isGrounded: boolean;
  verdict: string;
  supportedTermsCount?: number;
}

export interface PipelineTrace {
  originalQuery: string;
  hydeExpanded: boolean;
  hydeQuery?: string | null;
  hybridEnabled: boolean;
  rerankingEnabled: boolean;
  cragEnabled: boolean;
  steps: string[];
  cragStats?: CRAGStats;
  selfRag?: SelfRAGResult;
}

export interface AdvancedRAGConfig {
  useHybrid: boolean;
  useReranking: boolean;
  useHyde: boolean;
  useCrag: boolean;
  useSelfRag: boolean;
}

export interface QueryResponse {
  query: string;
  answer: string;
  sources: SourceCitation[];
  modelUsed: string;
  latencyMs: number;
  session_id: string;
  pipelineTrace?: PipelineTrace;
  selfRag?: SelfRAGResult;
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
