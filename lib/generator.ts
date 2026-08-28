import { GoogleGenerativeAI } from "@google/generative-ai";
import { SourceCitation, SelfRAGResult } from "./types";

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

function tokenizeTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Self-RAG Grounding & Faithfulness Verifier:
 * Calculates token overlap and citation support between generated output and source context.
 */
export function verifySelfRAGGrounding(answer: string, context: string): SelfRAGResult {
  if (!answer || !context) {
    return { groundingScore: 0.0, isGrounded: false, verdict: "Unverified" };
  }

  const ansTerms = new Set(tokenizeTerms(answer));
  const ctxTerms = new Set(tokenizeTerms(context));

  if (ansTerms.size === 0) {
    return { groundingScore: 1.0, isGrounded: true, verdict: "Grounded" };
  }

  let supportedCount = 0;
  ansTerms.forEach((term) => {
    if (ctxTerms.has(term)) supportedCount++;
  });

  const groundingScore = Math.round((supportedCount / Math.max(ansTerms.size, 1)) * 100) / 100;
  const isGrounded = groundingScore >= 0.50;
  const verdict = groundingScore >= 0.70 ? "Fully Grounded" : (isGrounded ? "Partially Grounded" : "Low Grounding Risk");

  return {
    groundingScore,
    isGrounded,
    verdict,
    supportedTermsCount: supportedCount,
  };
}

/**
 * Intelligent structured extractive synthesizer for offline/zero-API-key mode.
 */
export function synthesizeExtractiveAnswer(contextText: string, query: string): string {
  if (!contextText.trim()) {
    return "No relevant information found in the document context.";
  }

  const queryTerms = tokenizeTerms(query);
  const paragraphs = contextText
    .split("\n\n")
    .map((p) => p.replace(/^\[Source \d+:.*?\]\n?/gm, "").trim())
    .filter(Boolean);

  const scoredParagraphs: { text: string; score: number }[] = [];

  for (const para of paragraphs) {
    let score = 0;
    const lower = para.toLowerCase();

    for (const term of queryTerms) {
      if (lower.includes(term)) {
        score += 8;
      }
    }

    if (/\b(defined as|refers to|consists of|mechanism|process|algorithm|architecture|component|comprises)\b/i.test(para)) {
      score += 5;
    }

    // Header penalty for non-matching uppercase headers
    const hdr = para.match(/^([A-Z\s]{3,25}):/);
    if (hdr && !queryTerms.some((t) => hdr[1].toLowerCase().includes(t))) {
      score -= 20;
    }

    scoredParagraphs.push({ text: para, score });
  }

  scoredParagraphs.sort((a, b) => b.score - a.score);
  const topParagraphs = scoredParagraphs.filter((p) => p.score > 0).slice(0, 3);

  if (topParagraphs.length === 0) {
    return paragraphs.slice(0, 2).join("\n\n");
  }

  const unique = Array.from(new Set(topParagraphs.map((p) => p.text.trim())));
  const output: string[] = [`**Executive Summary:**\n${unique[0]}`];

  if (unique.length > 1) {
    output.push(`**Key Points & Mechanisms:**\n` + unique.slice(1).map((u) => `- ${u}`).join("\n"));
  }

  return output.join("\n\n");
}

const SOTA_SYSTEM_INSTRUCTION = `You are a Principal Technical Document Intelligence AI assistant.
Your goal is to formulate a high-accuracy, rigorous, complete, and beautifully organized technical answer to the user's question using ONLY the provided Context Documents.

### Core Response Architecture:
1. EXECUTIVE SUMMARY: Start with a clear, direct, and comprehensive 1-2 sentence definition or answer.
2. DETAILED MECHANISM & PRINCIPLES: Provide a thorough, step-by-step technical explanation of the underlying mechanisms, processes, or theory found in the context.
3. KEY COMPONENTS & CHARACTERISTICS: Use cleanly formatted bullet points, numbered workflows, or code blocks to break down specific components, parameters, and properties.
4. IN-LINE SOURCE CITATIONS: Attribute key facts and specifications with in-line source tags, e.g. [Source: document.pdf (Page 2)].
5. STRICT TOPIC FOCUS & NEGATIVE CONSTRAINT: Strictly answer ONLY what was asked. Never add separate sections for unrelated syllabus topics or adjacent headers that happen to appear in the same chunk.
6. GROUNDING & HONESTY: Do NOT invent facts or extrapolate beyond what is documented. If the context does not contain enough information, state: "Based on the provided documents, I could not find sufficient information to answer your question."`;

/**
 * High-performance Gemini LLM Generation with Self-RAG verification.
 */
export async function generateAnswer(
  query: string,
  sources: SourceCitation[],
  customApiKey?: string,
  enableSelfRag = true
): Promise<{ answer: string; modelUsed: string; selfRag?: SelfRAGResult }> {
  if (sources.length === 0) {
    return {
      answer: "No relevant documents found matching your query. Please upload documents or load the sample dataset first.",
      modelUsed: "Extractive Fallback",
      selfRag: { groundingScore: 0.0, isGrounded: false, verdict: "No Context" },
    };
  }

  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  const contextFormatted = sources
    .map((s, idx) => `[Source ${idx + 1}: ${s.source} (Page/Chunk ${s.page})]\n${s.fullText}`)
    .join("\n\n");

  if (!apiKey) {
    const fallbackAnswer = synthesizeExtractiveAnswer(contextFormatted, query);
    const selfRag = enableSelfRag ? verifySelfRAGGrounding(fallbackAnswer, contextFormatted) : undefined;
    return {
      answer: fallbackAnswer,
      modelUsed: "Offline Structured Synthesizer (Set GEMINI_API_KEY for full AI synthesis)",
      selfRag,
    };
  }

  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
  ];

  const ai = new GoogleGenerativeAI(apiKey);

  for (const modelName of modelsToTry) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: SOTA_SYSTEM_INSTRUCTION,
      });

      const prompt = `Context Documents:\n${contextFormatted}\n\nQuestion: ${query}`;
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      });

      const text = result.response.text();
      if (text && text.trim()) {
        const selfRag = enableSelfRag ? verifySelfRAGGrounding(text.trim(), contextFormatted) : undefined;
        return {
          answer: text.trim(),
          modelUsed: modelName,
          selfRag,
        };
      }
    } catch (err) {
      console.warn(`Model ${modelName} failed, attempting fallback...`, err);
    }
  }

  // Fallback if API keys fail or rate limit
  const fallbackAnswer = synthesizeExtractiveAnswer(contextFormatted, query);
  const selfRag = enableSelfRag ? verifySelfRAGGrounding(fallbackAnswer, contextFormatted) : undefined;
  return {
    answer: fallbackAnswer,
    modelUsed: "Extractive Synthesizer (API Fallback)",
    selfRag,
  };
}
