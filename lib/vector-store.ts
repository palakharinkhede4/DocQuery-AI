import { DocumentChunk, SourceCitation, SessionStats } from "./types";
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
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
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

// BM25 Ranking Score
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

  for (const word of queryKeywords) {
    const tf = chunkTf[word] || 0;
    if (tf > 0) {
      const df = docFreqs[word] || 1;
      const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / Math.max(avgDocLen, 1)));
      score += idf * (numerator / denominator);
    }
  }

  // Exact phrase match boost
  const rawQuery = queryKeywords.join(" ");
  if (rawQuery.length > 4 && chunk.text.toLowerCase().includes(rawQuery)) {
    score += 5.0;
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

export class VectorStoreManager {
  static async addChunks(
    sessionId: string,
    newChunks: DocumentChunk[],
    apiKey?: string
  ): Promise<number> {
    const store = getOrCreateStore(sessionId);

    for (const chunk of newChunks) {
      const tokens = tokenize(chunk.text);
      chunk.termFrequencies = computeTermFrequencies(tokens);

      if (apiKey) {
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

  static async search(
    sessionId: string,
    query: string,
    topK = 4,
    minScore = 0.15,
    apiKey?: string
  ): Promise<SourceCitation[]> {
    const store = getOrCreateStore(sessionId);
    if (store.chunks.length === 0) return [];

    const queryClean = query.trim();
    if (!queryClean) return [];

    const allTokens = tokenize(queryClean);
    const queryKeywords = allTokens.filter((w) => !STOPWORDS.has(w));
    const effectiveKeywords = queryKeywords.length > 0 ? queryKeywords : allTokens;

    let queryEmb: number[] | null = null;
    if (apiKey) {
      queryEmb = await generateGeminiEmbedding(queryClean, apiKey);
    }

    // Compute Document Frequencies (DF) for BM25
    const totalDocs = store.chunks.length;
    const docFreqs: Record<string, number> = {};
    let totalLen = 0;

    for (const chunk of store.chunks) {
      const tf = chunk.termFrequencies || {};
      const wordsInChunk = Object.keys(tf);
      totalLen += Object.values(tf).reduce((acc, v) => acc + v, 0);

      for (const word of wordsInChunk) {
        docFreqs[word] = (docFreqs[word] || 0) + 1;
      }
    }
    const avgDocLen = totalLen / Math.max(totalDocs, 1);

    const scoredChunks: { chunk: DocumentChunk; score: number }[] = [];

    for (const chunk of store.chunks) {
      let score = 0;

      if (queryEmb && chunk.embedding) {
        score = cosineSimilarity(queryEmb, chunk.embedding);
      } else {
        const bm25 = computeBM25Score(effectiveKeywords, chunk, docFreqs, totalDocs, avgDocLen);
        // Normalize BM25 score to 0..1 range approx
        score = bm25 > 0 ? Math.min(bm25 / (bm25 + 5), 1.0) : 0;
      }

      scoredChunks.push({ chunk, score });
    }

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);

    const filtered = scoredChunks.filter((item) => item.score >= minScore);
    const finalResults = filtered.length > 0 ? filtered.slice(0, topK) : scoredChunks.slice(0, 1);

    return finalResults.map((item) => ({
      source: item.chunk.source,
      page: item.chunk.page,
      snippet: item.chunk.text.slice(0, 160) + "...",
      fullText: item.chunk.text,
      score: Math.round(item.score * 1000) / 1000,
    }));
  }

  static async loadDemoDocuments(sessionId: string, apiKey?: string): Promise<{ totalChunks: number; files: string[] }> {
    const store = getOrCreateStore(sessionId);
    store.chunks = [];
    store.files.clear();

    const allChunks: DocumentChunk[] = [];
    for (const doc of DEMO_DOCUMENTS) {
      const chunks = chunkText(doc.content, doc.name, 1000, 150);
      allChunks.push(...chunks);
    }

    await this.addChunks(sessionId, allChunks, apiKey);

    return {
      totalChunks: store.chunks.length,
      files: Array.from(store.files),
    };
  }

  static getStats(sessionId: string): SessionStats {
    const store = getOrCreateStore(sessionId);
    const hasEmbeddings = store.chunks.some((c) => !!c.embedding);

    return {
      session_id: sessionId,
      totalDocuments: store.files.size,
      totalChunks: store.chunks.length,
      files: Array.from(store.files),
      embeddingType: hasEmbeddings ? "Gemini text-embedding-004" : "BM25 Vector Scoring Engine",
      llmModel: "Gemini 2.0 Flash / 1.5 Flash",
    };
  }

  static clearSession(sessionId: string): void {
    if (stores.has(sessionId)) {
      stores.delete(sessionId);
    }
  }
}
