import { NextRequest, NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id") || "default_session";
  const stats = VectorStoreManager.getStats(sessionId);

  return NextResponse.json({
    status: "healthy",
    engine: "DocQuery AI Next.js / Vercel Serverless RAG",
    session_id: sessionId,
    stats,
  });
}
