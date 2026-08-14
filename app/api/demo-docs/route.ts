import { NextRequest, NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id") || "default_session";
    const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY || undefined;

    const result = await VectorStoreManager.loadDemoDocuments(sessionId, apiKey);

    return NextResponse.json({
      status: "success",
      message: `Ingested ${result.files.length} sample technical documents (${result.totalChunks} chunks) successfully.`,
      processedFiles: result.files,
      totalChunks: result.totalChunks,
      documentsCount: result.files.length,
    });
  } catch (err: unknown) {
    console.error("Demo ingestion error:", err);
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Failed to load demo documents." },
      { status: 500 }
    );
  }
}
