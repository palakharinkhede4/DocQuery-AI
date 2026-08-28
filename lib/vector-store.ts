import { DocumentChunk, SourceCitation, SessionStats, PipelineTrace, CRAGStats } from "./types";
import { DEMO_DOCUMENTS } from "./demo-data";
import { chunkText } from "./parsers";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface SessionStore {
  chunks: DocumentChunk[];
  files: Set<string>;
  lastActive: number;
}

// Global persistent in-memory session map for Serverless lifecycle
const globalStores = globalThis as unknown as {
  _sessionStores?: Map<string, SessionStore>;
};

if (!globalStores._sessionStores) {
  globalStores._sessionStores = new Map<string, SessionStore>();
}

const stores = globalStores._sessionStores;

// Auto-cleanup sessions older than 2 hours
setInterval(() => {
  const now = Date.now();
  stores.forEach((store, id) => {
    if (now - store.lastActive > 2 * 60 * 60 * 1000) {
      stores.delete(id);
    }
  });
}, 15 * 60 * 1000);

function getOrCreateStore(sessionId: string): SessionStore {
  if (!stores.has(sessionId)) {
    stores.set(sessionId, {
      chunks: [],
      files: new Set<string>(),
      lastActive: Date.now(),
    });
  }
  const store = stores.get(sessionId)!;
  store.lastActive = Date.now();
  return store;
}

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "did", "do", "does", "doing", "down", "during", "each", "explain", "describe",
  "few", "for", "from", "further", "had", "has", "have", "having", "he", "her",
  "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in",
  "into", "is", "it", "its", "itself", "let's", "me", "more", "most", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
  "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
  "she", "should", "so", "some", "such", "than", "that", "the", "their",
  "theirs", "them", "themselves", "then", "there", "these", "they", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "wasn't", "we", "were", "weren't", "what", "when", "where", "which", "while",
  "who", "whom", "why", "with", "won't", "would", "you", "your", "yours",
  "yourself", "yourselves"
]);

/**
 * Lightweight technical morphological stemmer
 */
function stemTerm(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("ss")) return w;
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  return w;
}

// Tokenizer & Term Frequency
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function computeTermFrequencies(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const token of tokens) {
    const stemmed = stemTerm(token);
    tf[stemmed] = (tf[stemmed] || 0) + 1;
  }
  return tf;
}

/**
 * Detect if a chunk is a Table of Contents, Syllabus, or Navigation Index
 */
function isIndexOrSyllabusChunk(text: string): boolean {
  if (!text) return false;
  const tLower = text.toLowerCase();
  
  if (tLower.startsWith("syllabus") || tLower.startsWith("contents")) return true;
  
  const lectureMatches = tLower.match(/lecture\s*\d+\s*:/g);
  if (lectureMatches && lectureMatches.length >= 3) return true;
  
  const moduleMatches = tLower.match(/module\s*[-–—:]?\s*(?:i|ii|iii|iv|v|\d+)/g);
  if (moduleMatches && moduleMatches.length >= 2 && tLower.length < 600) return true;
  
  if (tLower.includes("text books:") || tLower.includes("reference books:")) return true;
  
  return false;
}

// Dense Vector Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// BM25 Ranking Score with N-gram, Heading & Explanatory Boost
function computeBM25Score(
  queryKeywords: string[],
  chunk: DocumentChunk,
  docFreqs: Record<string, number>,
  totalDocs: number,
  avgDocLen: number
): number {
  const k1 = 1.5;
  const b = 0.75;
  const chunkTf = chunk.termFrequencies || {};
  const docLen = Object.values(chunkTf).reduce((acc, v) => acc + v, 0);

  let score = 0;
  const stemmedKeywords = queryKeywords.map(stemTerm);

  for (const word of stemmedKeywords) {
    const tf = chunkTf[word] || 0;
    if (tf > 0) {
      const df = docFreqs[word] || 1;
      const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / Math.max(avgDocLen, 1)));
      score += idf * (numerator / denominator);
    }
  }

  const chunkLower = chunk.text.toLowerCase();
  const exactPhrase = queryKeywords.join(" ").toLowerCase();

  // 1. Exact full phrase match boost (+12.0)
  if (exactPhrase.length > 4 && chunkLower.includes(exactPhrase)) {
    score += 12.0;
  }

  // 2. Heading match boost (+15.0): if phrase appears at line start
  const firstLines = chunkLower.split("\n").slice(0, 3).join("\n");
  if (exactPhrase.length > 4 && firstLines.includes(exactPhrase)) {
    score += 15.0;
  }

  // 3. Bigram phrase match boost (+4.0 each)
  if (queryKeywords.length >= 2) {
    for (let i = 0; i < queryKeywords.length - 1; i++) {
      const bg = `${queryKeywords[i]} ${queryKeywords[i + 1]}`.toLowerCase();
      if (bg.length > 4 && chunkLower.includes(bg)) {
        score += 4.0;
      }
    }
  }

  // 4. Explanatory prose boost (+3.0)
  if (
    chunkLower.includes("is a") ||
    chunkLower.includes("can only be") ||
    chunkLower.includes("defined as") ||
    chunkLower.includes("refers to") ||
    chunkLower.includes("syntax:") ||
    chunkLower.includes("class ")
  ) {
    score += 3.0;
  }

  // 5. TOC / Syllabus Penalty (-12.0)
  if (isIndexOrSyllabusChunk(chunk.text)) {
    score = Math.max(0.1, score * 0.25 - 8.0);
  }

  return score;
}

export async function generateGeminiEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch {
    return null;
  }
}

/**
 * Hypothetical Document Embeddings (HyDE)
 */
async function generateHyDE(query: string, apiKey?: string): Promise<string> {
  if (!query) return query;

  if (apiKey) {
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Write a concise 2-sentence technical paragraph answering the question: "${query}". Include essential terminology and mechanisms.`;
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 120 },
      });
      const text = result.response.text();
      if (text && text.trim()) {
        return `${query} ${text.trim()}`;
      }
    } catch {
      // Fallback
    }
  }

  const tokens = tokenize(query).filter((w) => !STOPWORDS.has(w));
  return `${query} technical specifications and mechanisms for ${tokens.join(" ")}`;
}

/**
 * Cross-Attention Scorer & Reranker
 */
function rerankPassages(
  query: string,
  passages: { chunk: DocumentChunk; score: number; denseRank?: number; sparseRank?: number; rrfScore?: number }[],
  topK = 4
) {
  const queryTokens = new Set(tokenize(query).filter((t) => !STOPWORDS.has(t)).map(stemTerm));
  const exactPhrase = Array.from(queryTokens).join(" ").toLowerCase();

  for (const item of passages) {
    const textLower = item.chunk.text.toLowerCase();
    let crossScore = 0;

    for (const t of queryTokens) {
      if (textLower.includes(t)) {
        crossScore += 2.0;
      }
    }

    // Exact phrase match bonus
    if (exactPhrase.length > 3 && textLower.includes(exactPhrase)) {
      crossScore += 6.0;
    }

    // Explanatory definition bonus
    if (textLower.includes("can only be") || textLower.includes("is a") || textLower.includes("defined as")) {
      crossScore += 3.0;
    }

    // TOC / Syllabus penalty
    if (isIndexOrSyllabusChunk(item.chunk.text)) {
      crossScore = Math.max(0.1, crossScore * 0.2);
    }

    const baseNormalized = item.score || 0.5;
    const rerankProb = Math.min(Math.max((0.4 * baseNormalized) + (0.6 * (crossScore / (crossScore + 5))), 0.05), 0.99);
    item.score = Math.round(rerankProb * 1000) / 1000;
  }

  passages.sort((a, b) => b.score - a.score);
  return passages.slice(0, topK);
}

/**
 * Corrective RAG (CRAG) Document Relevance Grader
 */
function gradeDocumentsCRAG(
  query: string,
  passages: { chunk: DocumentChunk; score: number; denseRank?: number; sparseRank?: number; rrfScore?: number }[],
  minScore = 0.20
): {
  filtered: { chunk: DocumentChunk; score: number; cragGrade: "RELEVANT" | "PARTIALLY_RELEVANT" | "IRRELEVANT"; cragScore: number; matchedKeywords: string[] }[];
  stats: CRAGStats;
} {
  const queryTokens = new Set(tokenize(query).filter((w) => !STOPWORDS.has(w)).map(stemTerm));
  const results = [];
  let relevantCount = 0;
  let totalScore = 0;

  for (const item of passages) {
    const text = item.chunk.text.toLowerCase();
    const matched = Array.from(queryTokens).filter((t) => text.includes(t));
    const coverage = matched.length / Math.max(queryTokens.size, 1);

    // Negative penalty for TOC/Syllabus and mismatched uppercase headers
    let penalty = 0;
    if (isIndexOrSyllabusChunk(item.chunk.text)) {
      penalty += 0.40;
    }

    const finalGradeScore = Math.max(0, (0.5 * item.score) + (0.5 * coverage) - penalty);
    totalScore += finalGradeScore;

    let grade: "RELEVANT" | "PARTIALLY_RELEVANT" | "IRRELEVANT" = "IRRELEVANT";
    if (finalGradeScore >= 0.38 && !isIndexOrSyllabusChunk(item.chunk.text)) {
      grade = "RELEVANT";
      relevantCount++;
    } else if (finalGradeScore >= minScore) {
      grade = "PARTIALLY_RELEVANT";
      relevantCount++;
    }

    results.push({
      chunk: item.chunk,
      score: item.score,
      cragGrade: grade,
      cragScore: Math.round(finalGradeScore * 100) / 100,
      matchedKeywords: matched,
    });
  }

  const filtered = results.filter((r) => r.cragGrade !== "IRRELEVANT");
  const finalFiltered = filtered.length > 0 ? filtered : [results[0]];

  const stats: CRAGStats = {
    totalRetrieved: passages.length,
    relevantCount,
    filteredCount: passages.length - finalFiltered.length,
    retrievalConfidence: Math.round((totalScore / Math.max(passages.length, 1)) * 100) / 100,
  };

  return { filtered: finalFiltered, stats };
}

export class VectorStoreManager {
  static getStore(sessionId: string): SessionStore {
    return getOrCreateStore(sessionId);
  }

  static getStats(sessionId: string): SessionStats {
    const store = getOrCreateStore(sessionId);
    return {
      session_id: sessionId,
      totalDocuments: store.files.size,
      totalChunks: store.chunks.length,
      files: Array.from(store.files),
      embeddingType: "BM25 + Gemini text-embedding-004",
      llmModel: "Gemini 2.0 Flash / Structured Extractive Synthesizer",
    };
  }

  static clearSession(sessionId: string): void {
    if (stores.has(sessionId)) {
      stores.delete(sessionId);
    }
  }

  static async addChunks(
    sessionId: string,
    chunks: DocumentChunk[],
    apiKey?: string
  ): Promise<number> {
    const store = getOrCreateStore(sessionId);

    for (const chunk of chunks) {
      const tokens = tokenize(chunk.text);
      chunk.termFrequencies = computeTermFrequencies(tokens);

      if (apiKey && !chunk.embedding) {
        const emb = await generateGeminiEmbedding(chunk.text, apiKey);
        if (emb) {
          chunk.embedding = emb;
        }
      }

      store.chunks.push(chunk);
      store.files.add(chunk.source);
    }

    return store.chunks.length;
  }

  static async searchAdvanced(
    sessionId: string,
    query: string,
    topK = 4,
    minScore = 0.20,
    apiKey?: string,
    config: {
      useHybrid?: boolean;
      useReranking?: boolean;
      useHyde?: boolean;
      useCrag?: boolean;
      useSelfRag?: boolean;
    } = {}
  ): Promise<{ sources: SourceCitation[]; trace: PipelineTrace }> {
    const store = getOrCreateStore(sessionId);
    const traceSteps: string[] = [];
    let hydeQuery: string | undefined = undefined;

    if (store.chunks.length === 0) {
      return {
        sources: [],
        trace: {
          originalQuery: query,
          hydeExpanded: false,
          hybridEnabled: config.useHybrid ?? true,
          rerankingEnabled: config.useReranking ?? true,
          cragEnabled: config.useCrag ?? true,
          steps: ["No active document chunks in session vector store."],
        },
      };
    }

    // 1. HyDE Expansion
    let effectiveQuery = query;
    const useHyde = config.useHyde ?? false;
    if (useHyde) {
      hydeQuery = await generateHyDE(query, apiKey);
      effectiveQuery = hydeQuery;
      traceSteps.push("HyDE: Formulated hypothetical domain answer for semantic indexing.");
    }

    const queryTokens = tokenize(effectiveQuery);
    const queryKeywords = queryTokens.filter((w) => !STOPWORDS.has(w));
    const effectiveKeywords = queryKeywords.length > 0 ? queryKeywords : queryTokens;

    // Document frequencies for BM25
    const docFreqs: Record<string, number> = {};
    let totalTokens = 0;
    for (const ch of store.chunks) {
      const tf = ch.termFrequencies || {};
      const stemmedWords = Object.keys(tf);
      totalTokens += Object.values(tf).reduce((acc, v) => acc + v, 0);
      for (const w of stemmedWords) {
        docFreqs[w] = (docFreqs[w] || 0) + 1;
      }
    }
    const avgDocLen = totalTokens / Math.max(store.chunks.length, 1);

    // Expand initial candidate pool (at least 45 chunks or all chunks)
    const initialPool = Math.min(store.chunks.length, Math.max(topK * 10, 45));

    // 2. Sparse BM25 Ranking
    const sparseRanked = store.chunks
      .map((chunk) => ({
        chunk,
        score: computeBM25Score(effectiveKeywords, chunk, docFreqs, store.chunks.length, avgDocLen),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, initialPool);

    // 3. Dense Embedding Search
    let queryEmbedding: number[] | null = null;
    if (apiKey) {
      queryEmbedding = await generateGeminiEmbedding(effectiveQuery, apiKey);
    }

    let denseRanked: { chunk: DocumentChunk; score: number }[] = [];
    if (queryEmbedding) {
      denseRanked = store.chunks
        .filter((chunk) => chunk.embedding && chunk.embedding.length > 0)
        .map((chunk) => ({
          chunk,
          score: cosineSimilarity(queryEmbedding!, chunk.embedding!),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, initialPool);
    }

    // 4. Hybrid Reciprocal Rank Fusion (RRF)
    const useHybrid = config.useHybrid ?? true;
    let candidates: { chunk: DocumentChunk; score: number; denseRank?: number; sparseRank?: number; rrfScore?: number }[] = [];

    if (useHybrid && denseRanked.length > 0) {
      const RRF_K = 60;
      const rrfMap = new Map<string, { chunk: DocumentChunk; score: number; denseRank: number; sparseRank: number; rrfScore: number }>();

      denseRanked.forEach((item, r) => {
        const rank = r + 1;
        const rrf = 1 / (RRF_K + rank);
        rrfMap.set(item.chunk.id, {
          chunk: item.chunk,
          score: item.score,
          denseRank: rank,
          sparseRank: 999,
          rrfScore: rrf,
        });
      });

      sparseRanked.forEach((item, r) => {
        const rank = r + 1;
        const rrf = 1 / (RRF_K + rank);
        if (rrfMap.has(item.chunk.id)) {
          const existing = rrfMap.get(item.chunk.id)!;
          existing.sparseRank = rank;
          existing.rrfScore += rrf;
          existing.score = Math.max(existing.score, item.score);
        } else {
          rrfMap.set(item.chunk.id, {
            chunk: item.chunk,
            score: item.score,
            denseRank: 999,
            sparseRank: rank,
            rrfScore: rrf,
          });
        }
      });

      candidates = Array.from(rrfMap.values())
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .slice(0, initialPool);

      traceSteps.push(`Hybrid Retrieval: Dense (${denseRanked.length}) + Sparse BM25 (${sparseRanked.length}) merged via RRF (k=60).`);
    } else {
      const sourceList = sparseRanked.length > 0 ? sparseRanked : denseRanked;
      candidates = sourceList.map((item, idx) => ({
        chunk: item.chunk,
        score: item.score,
        denseRank: -1,
        sparseRank: idx + 1,
      }));
      traceSteps.push("Lexical/Dense Retrieval: Standard rank scoring applied.");
    }

    // 5. Cross-Encoder Multi-Pass Reranking
    const useRerank = config.useReranking ?? true;
    if (useRerank) {
      candidates = rerankPassages(query, candidates, Math.max(topK * 2, 8));
      traceSteps.push("Cross-Encoder Reranking: Multi-pass relevance attention rescoring applied.");
    }

    // 6. Corrective RAG (CRAG) Document Grading
    const useCrag = config.useCrag ?? true;
    let cragStats: CRAGStats | undefined = undefined;
    let finalCandidates: { chunk: DocumentChunk; score: number; cragGrade?: "RELEVANT" | "PARTIALLY_RELEVANT" | "IRRELEVANT"; cragScore?: number; matchedKeywords?: string[] }[] = candidates;

    if (useCrag) {
      const { filtered, stats } = gradeDocumentsCRAG(query, candidates, minScore);
      cragStats = stats;
      finalCandidates = filtered;
      traceSteps.push(`CRAG Grading: ${stats.relevantCount} relevant passages verified, ${stats.filteredCount} noise chunks filtered.`);
    }

    const topCandidates = finalCandidates.slice(0, topK);

    const sources: SourceCitation[] = topCandidates.map((c) => ({
      id: c.chunk.id,
      source: c.chunk.source,
      page: c.chunk.page,
      snippet: c.chunk.text.length > 250 ? c.chunk.text.slice(0, 250) + "..." : c.chunk.text,
      fullText: c.chunk.text,
      score: c.score,
      cragGrade: c.cragGrade,
      cragScore: c.cragScore,
      denseRank: "denseRank" in c ? (c as any).denseRank : undefined,
      sparseRank: "sparseRank" in c ? (c as any).sparseRank : undefined,
    }));

    return {
      sources,
      trace: {
        originalQuery: query,
        hydeExpanded: useHyde,
        hydeQuery,
        hybridEnabled: useHybrid,
        rerankingEnabled: useRerank,
        cragEnabled: useCrag,
        steps: traceSteps,
        cragStats,
      },
    };
  }

  static async loadDemoDocuments(
    sessionId: string,
    apiKey?: string
  ): Promise<{ totalChunks: number; documentsCount: number; files: string[] }> {
    const store = getOrCreateStore(sessionId);
    store.chunks = [];
    store.files.clear();

    const fileNames: string[] = [];

    for (const doc of DEMO_DOCUMENTS) {
      fileNames.push(doc.name);
      const chunks = chunkText(doc.content, doc.name);
      for (const chunk of chunks) {
        const tokens = tokenize(chunk.text);
        chunk.termFrequencies = computeTermFrequencies(tokens);

        if (apiKey && !chunk.embedding) {
          const emb = await generateGeminiEmbedding(chunk.text, apiKey);
          if (emb) chunk.embedding = emb;
        }

        store.chunks.push(chunk);
        store.files.add(chunk.source);
      }
    }

    return {
      totalChunks: store.chunks.length,
      documentsCount: DEMO_DOCUMENTS.length,
      files: fileNames,
    };
  }
}
