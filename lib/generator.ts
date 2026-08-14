import { GoogleGenerativeAI } from "@google/generative-ai";
import { SourceCitation } from "./types";

/**
 * Intelligent extractive synthesizer for offline/zero-API-key mode.
 */
export function synthesizeExtractiveAnswer(contextText: string, query: string): string {
  if (!contextText.trim()) {
    return "No relevant information found in the document context.";
  }

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["what", "how", "why", "when", "where", "explain", "describe", "does", "the", "and", "for"].includes(w));

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
        score += 10;
      }
    }

    if (/\b(defined as|refers to|consists of|mechanism|process|algorithm|architecture|component)\b/i.test(para)) {
      score += 5;
    }

    scoredParagraphs.push({ text: para, score });
  }

  scoredParagraphs.sort((a, b) => b.score - a.score);
  const topParagraphs = scoredParagraphs.filter((p) => p.score > 0).slice(0, 3);

  if (topParagraphs.length === 0) {
    return paragraphs.slice(0, 2).join("\n\n");
  }

  return topParagraphs.map((p) => p.text).join("\n\n");
}

/**
 * High-performance Gemini LLM Generation.
 */
export async function generateAnswer(
  query: string,
  sources: SourceCitation[],
  customApiKey?: string
): Promise<{ answer: string; modelUsed: string }> {
  if (sources.length === 0) {
    return {
      answer: "No relevant documents found matching your query. Please upload documents or load the sample dataset first.",
      modelUsed: "Extractive Fallback",
    };
  }

  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  const contextFormatted = sources
    .map((s, idx) => `[Source ${idx + 1}: ${s.source} (Page/Chunk ${s.page})]\n${s.fullText}`)
    .join("\n\n");

  if (!apiKey) {
    const fallbackAnswer = synthesizeExtractiveAnswer(contextFormatted, query);
    return {
      answer: fallbackAnswer,
      modelUsed: "Offline Context Synthesizer (Set GEMINI_API_KEY for full AI synthesis)",
    };
  }

  const systemInstruction = `You are a technical document intelligence assistant.
Your task is to provide an accurate, thorough, clear, and professional response to the user's question using ONLY the provided document context.

Guidelines:
1. Thorough Explanation: Provide a comprehensive and complete answer explaining concepts, mechanisms, and key properties found in the context.
2. Strict Topic Focus: Answer only what is asked without deviating into unrelated sections.
3. Clean Formatting: Use Markdown with bold headers, bullet lists, and code blocks where applicable.
4. Professional Tone: Do NOT use emojis, hype, or conversational filler phrases.
5. Grounding: If the provided context does not contain enough information to answer the question, state: "Based on the provided documents, I could not find sufficient information to answer your question."`;

  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  const ai = new GoogleGenerativeAI(apiKey);

  for (const modelName of modelsToTry) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction,
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
        return {
          answer: text.trim(),
          modelUsed: modelName,
        };
      }
    } catch (err) {
      console.warn(`Model ${modelName} failed, attempting fallback...`, err);
    }
  }

  // Fallback if API keys fail or rate limit
  return {
    answer: synthesizeExtractiveAnswer(contextFormatted, query),
    modelUsed: "Extractive Synthesizer (API Fallback)",
  };
}
