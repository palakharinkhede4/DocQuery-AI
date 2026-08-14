import { NextRequest, NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";
import { generateAnswer } from "@/lib/generator";
import { QueryResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { query, top_k = 4, min_score = 0.25, session_id = "default_session" } = body;
    const customApiKey = req.headers.get("x-gemini-api-key") || undefined;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Query string cannot be empty." },
        { status: 400 }
      );
    }

    // 1. Vector Search
    const sources = await VectorStoreManager.search(
      session_id,
      query,
      Number(top_k),
      Number(min_score),
      customApiKey
    );

    // 2. Answer Generation
    const { answer, modelUsed } = await generateAnswer(query, sources, customApiKey);

    const latencyMs = Date.now() - startTime;

    const responseData: QueryResponse = {
      query,
      answer,
      sources,
      modelUsed,
      latencyMs,
      session_id,
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
