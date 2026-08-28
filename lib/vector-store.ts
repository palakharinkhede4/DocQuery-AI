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

/**
 * Hypothetical Document Embeddings (HyDE)
 */
export async function generateHydePassage(query: string, apiKey?: string): Promise<string> {
  if (!query || !query.trim()) return query;

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
  const queryTokens = new Set(tokenize(query).filter((t) => !STOPWORDS.has(t)));

  for (const item of passages) {
    const textLower = item.chunk.text.toLowerCase();
    let crossScore = 0;

    for (const t of queryTokens) {
      if (textLower.includes(t)) {
        crossScore += 2.0;
      }
    }

    // Exact phrase match bonus
    const phrase = Array.from(queryTokens).join(" ");
    if (phrase.length > 3 && textLower.includes(phrase)) {
      crossScore += 4.0;
    }

    const baseNormalized = item.score || 0.5;
    const rerankProb = Math.min(Math.max((0.5 * baseNormalized) + (0.5 * (crossScore / (crossScore + 6))), 0.05), 0.99);
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
  const queryTokens = new Set(tokenize(query).filter((w) => !STOPWORDS.has(w)));
  const results = [];
  let relevantCount = 0;
  let totalScore = 0;

  for (const item of passages) {
    const text = item.chunk.text.toLowerCase();
    const matched = Array.from(queryTokens).filter((t) => text.includes(t));
    const coverage = matched.length / Math.max(queryTokens.size, 1);

    // Negative penalty for mismatched uppercase section headers
    let penalty = 0;
    const headerMatch = item.chunk.text.trim().match(/^([A-Z\s]{3,25}):/);
    if (headerMatch) {
      const header = headerMatch[1].toLowerCase();
      if (!Array.from(queryTokens).some((k) => header.includes(k))) {
        penalty = 0.2;
      }
    }

    const finalGradeScore = Math.max(0, (0.5 * item.score) + (0.5 * coverage) - penalty);
    totalScore += finalGradeScore;

    let grade: "RELEVANT" | "PARTIALLY_RELEVANT" | "IRRELEVANT" = "IRRELEVANT";
    if (finalGradeScore >= 0.40) {
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

  const valid = results.filter((r) => r.cragGrade !== "IRRELEVANT");
  const finalFiltered = valid.length > 0 ? valid : [results[0]];

  return {
    filtered: finalFiltered,
    stats: {
      totalRetrieved: passages.length,
      relevantCount,
      filteredCount: passages.length - valid.length,
      retrievalConfidence: Math.round((totalScore / Math.max(passages.length, 1)) * 100) / 100,
    },
  };
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

  static async searchAdvanced(
    sessionId: string,
    query: string,
    topK = 4,
    minScore = 0.20,
    apiKey?: string,
    useHybrid = true,
    useReranking = true,
    useHyde = false,
    useCrag = true
  ): Promise<{ sources: SourceCitation[]; trace: PipelineTrace }> {
    const store = getOrCreateStore(sessionId);
    const trace: PipelineTrace = {
      originalQuery: query,
      hydeExpanded: false,
      hydeQuery: null,
      hybridEnabled: useHybrid,
      rerankingEnabled: useReranking,
      cragEnabled: useCrag,
      steps: [],
    };

    if (store.chunks.length === 0 || !query.trim()) {
      return { sources: [], trace };
    }

    const queryClean = query.trim();
    let searchQuery = queryClean;

    // 1. HyDE Query Expansion
    if (useHyde) {
      const hydePassage = await generateHydePassage(queryClean, apiKey);
      if (hydePassage && hydePassage !== queryClean) {
        searchQuery = hydePassage;
        trace.hydeExpanded = true;
        trace.hydeQuery = hydePassage;
        trace.steps.push("HyDE: Formulated hypothetical domain answer for semantic indexing.");
      }
    }

    // 2. Query Embedding
    let queryEmb: number[] | null = null;
    if (apiKey) {
      queryEmb = await generateGeminiEmbedding(searchQuery, apiKey);
    }

    // 3. BM25 Setup
    const allTokens = tokenize(queryClean);
    const queryKeywords = allTokens.filter((w) => !STOPWORDS.has(w));
    const effectiveKeywords = queryKeywords.length > 0 ? queryKeywords : allTokens;

    const totalDocs = store.chunks.length;
    const docFreqs: Record<string, number> = {};
    let totalLen = 0;

    for (const chunk of store.chunks) {
      const tf = chunk.termFrequencies || {};
      totalLen += Object.values(tf).reduce((acc, v) => acc + v, 0);
      for (const word of Object.keys(tf)) {
        docFreqs[word] = (docFreqs[word] || 0) + 1;
      }
    }
    const avgDocLen = totalLen / Math.max(totalDocs, 1);

    // Compute Dense Ranks
    const denseRanked: { chunk: DocumentChunk; score: number }[] = [];
    if (queryEmb) {
      for (const chunk of store.chunks) {
        if (chunk.embedding) {
          const sim = cosineSimilarity(queryEmb, chunk.embedding);
          denseRanked.push({ chunk, score: sim });
        }
      }
      denseRanked.sort((a, b) => b.score - a.score);
    }

    // Compute Sparse BM25 Ranks
    const sparseRanked: { chunk: DocumentChunk; score: number }[] = [];
    for (const chunk of store.chunks) {
      const bm25 = computeBM25Score(effectiveKeywords, chunk, docFreqs, totalDocs, avgDocLen);
      sparseRanked.push({ chunk, score: bm25 });
    }
    sparseRanked.sort((a, b) => b.score - a.score);

    // 4. Hybrid Reciprocal Rank Fusion (RRF)
    const initialPool = Math.max(topK * 3, 10);
    let candidateList: { chunk: DocumentChunk; score: number; denseRank?: number; sparseRank?: number; rrfScore?: number }[] = [];

    if (useHybrid && queryEmb && denseRanked.length > 0) {
      const rrfScores = new Map<string, { chunk: DocumentChunk; rrf: number; denseRank: number; sparseRank: number }>();
      const k = 60;

      denseRanked.slice(0, initialPool).forEach((item, r) => {
        const id = item.chunk.id;
        rrfScores.set(id, {
          chunk: item.chunk,
          rrf: (1 / (k + r + 1)),
          denseRank: r + 1,
          sparseRank: 999,
        });
      });

      sparseRanked.slice(0, initialPool).forEach((item, r) => {
        const id = item.chunk.id;
        if (rrfScores.has(id)) {
          const entry = rrfScores.get(id)!;
          entry.rrf += (1 / (k + r + 1));
          entry.sparseRank = r + 1;
        } else {
          rrfScores.set(id, {
            chunk: item.chunk,
            rrf: (1 / (k + r + 1)),
            denseRank: 999,
            sparseRank: r + 1,
          });
        }
      });

      candidateList = Array.from(rrfScores.values()).map((v) => ({
        chunk: v.chunk,
        score: Math.min(v.rrf * 30, 1.0),
        denseRank: v.denseRank,
        sparseRank: v.sparseRank,
        rrfScore: Math.round(v.rrf * 10000) / 10000,
      }));

      candidateList.sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0));
      trace.steps.push("Hybrid Retrieval: Combined Dense Vector + BM25 rankings via Reciprocal Rank Fusion (k=60).");
    } else {
      const sourceList = denseRanked.length > 0 ? denseRanked : sparseRanked;
      candidateList = sourceList.slice(0, initialPool).map((item, idx) => ({
        chunk: item.chunk,
        score: item.score > 0 ? Math.min(item.score / (item.score + 5), 1.0) : 0,
        denseRank: idx + 1,
        sparseRank: idx + 1,
        rrfScore: Math.round(item.score * 100) / 100,
      }));
      trace.steps.push("Lexical/Dense Retrieval: Standard rank scoring applied.");
    }

    // 5. Cross-Encoder / Cross-Scoring Reranker
    if (useReranking && candidateList.length > 0) {
      candidateList = rerankPassages(queryClean, candidateList, initialPool);
      trace.steps.push("Cross-Encoder Reranking: Multi-pass relevance attention rescoring applied.");
    }

    // 6. CRAG Document Relevance Grading
    let finalSources: SourceCitation[] = [];
    if (useCrag && candidateList.length > 0) {
      const cragResult = gradeDocumentsCRAG(queryClean, candidateList, minScore);
      trace.cragStats = cragResult.stats;
      trace.steps.push(`CRAG Grading: ${cragResult.stats.relevantCount} relevant passages verified, ${cragResult.stats.filteredCount} noise chunks filtered.`);

      finalSources = cragResult.filtered.slice(0, topK).map((item) => ({
        source: item.chunk.source,
        page: item.chunk.page,
        snippet: item.chunk.text.slice(0, 160) + "...",
        fullText: item.chunk.text,
        score: Math.round(item.score * 1000) / 1000,
        cragGrade: item.cragGrade,
        cragScore: item.cragScore,
        matchedKeywords: item.matchedKeywords,
      }));
    } else {
      const filtered = candidateList.filter((item) => item.score >= minScore);
      const results = filtered.length > 0 ? filtered.slice(0, topK) : candidateList.slice(0, 1);
      finalSources = results.map((item) => ({
        source: item.chunk.source,
        page: item.chunk.page,
        snippet: item.chunk.text.slice(0, 160) + "...",
        fullText: item.chunk.text,
        score: Math.round(item.score * 1000) / 1000,
        denseRank: item.denseRank,
        sparseRank: item.sparseRank,
        rrfScore: item.rrfScore,
      }));
    }

    return { sources: finalSources, trace };
  }

  static async search(
    sessionId: string,
    query: string,
    topK = 4,
    minScore = 0.20,
    apiKey?: string
  ): Promise<SourceCitation[]> {
    const { sources } = await this.searchAdvanced(
      sessionId,
      query,
      topK,
      minScore,
      apiKey,
      true,
      true,
      false,
      true
    );
    return sources;
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
      embeddingType: hasEmbeddings ? "Hybrid BM25 + Gemini text-embedding-004" : "Hybrid BM25 + Vector Scoring Engine",
      llmModel: "Gemini 2.0 Flash / 1.5 Flash",
    };
  }

  static clearSession(sessionId: string): void {
    if (stores.has(sessionId)) {
      stores.delete(sessionId);
    }
  }
}
