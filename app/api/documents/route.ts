import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/parsers";
import { VectorStoreManager } from "@/lib/vector-store";
import { DocumentChunk } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id") || "default_session";
  const stats = VectorStoreManager.getStats(sessionId);

  return NextResponse.json(stats);
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id") || "default_session";
    const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY || undefined;

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { status: "error", message: "No files uploaded." },
        { status: 400 }
      );
    }

    const allChunks: DocumentChunk[] = [];
    const processedFiles: string[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await parseDocument(file.name, buffer);

      if (parsed.chunks.length > 0) {
        allChunks.push(...parsed.chunks);
        processedFiles.push(file.name);
      }
    }

    if (allChunks.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Could not extract valid text from uploaded files." },
        { status: 400 }
      );
    }

    const totalChunks = await VectorStoreManager.addChunks(sessionId, allChunks, apiKey);

    return NextResponse.json({
      status: "success",
      processedFiles,
      totalChunks,
      documentsCount: processedFiles.length,
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Document upload failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id") || "default_session";

  VectorStoreManager.clearSession(sessionId);

  return NextResponse.json({
    status: "success",
    message: `Session '${sessionId}' documents and vector index cleared successfully.`,
  });
}
