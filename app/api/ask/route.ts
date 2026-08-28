import { NextRequest, NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";
import { generateAnswer } from "@/lib/generator";
import { QueryResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      query,
      top_k = 4,
      min_score = 0.20,
      session_id = "default_session",
      use_hybrid = true,
      use_reranking = true,
      use_hyde = false,
      use_crag = true,
      use_self_rag = true,
    } = body;

    const customApiKey = req.headers.get("x-gemini-api-key") || undefined;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Query string cannot be empty." },
        { status: 400 }
      );
    }

    // 1. Multi-Stage Advanced Retrieval
    const { sources, trace } = await VectorStoreManager.searchAdvanced(
      session_id,
      query,
      Number(top_k),
      Number(min_score),
      customApiKey,
      {
        useHybrid: Boolean(use_hybrid),
        useReranking: Boolean(use_reranking),
        useHyde: Boolean(use_hyde),
        useCrag: Boolean(use_crag),
        useSelfRag: Boolean(use_self_rag),
      }
    );

    // 2. Structured Answer Generation with Self-RAG verification
    const { answer, modelUsed, selfRag } = await generateAnswer(
      query,
      sources,
      customApiKey,
      use_self_rag
    );

    if (selfRag) {
      trace.selfRag = selfRag;
    }

    const latencyMs = Date.now() - startTime;

    const responseData: QueryResponse = {
      query,
      answer,
      sources,
      modelUsed,
      latencyMs,
      session_id,
      pipelineTrace: trace,
      selfRag,
    };

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    console.error("Ask query error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal processing error." },
      { status: 500 }
    );
  }
}
