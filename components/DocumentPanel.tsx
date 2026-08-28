"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Files,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

interface DocumentPanelProps {
  sessionId: string;
  files: string[];
  totalChunks: number;
  onUploadSuccess: () => void;
}

async function parseResponseSafe(res: Response) {
  const text = await res.text().catch(() => "");
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 413 || text.toLowerCase().includes("request entity too large")) {
      throw new Error("File exceeds upload limit (4.5MB). Please upload smaller documents.");
    }
    if (!res.ok) {
      throw new Error(`Upload failed (HTTP ${res.status})`);
    }
    throw new Error("Unexpected server response.");
  }

  if (!res.ok || data?.status === "error") {
    throw new Error(data?.message || data?.error || `Upload failed (HTTP ${res.status})`);
  }

  return data;
}

export function DocumentPanel({
  sessionId,
  files,
  totalChunks,
  onUploadSuccess,
}: DocumentPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setIsError(false);

    const fileList = Array.from(selectedFiles);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        if (file.size > 4.5 * 1024 * 1024) {
          throw new Error(`"${file.name}" is too large (max 4.5MB). Please upload a smaller document.`);
        }

        setStatusMessage(`Reading (${i + 1}/${fileList.length}): ${file.name}...`);

        const formData = new FormData();
        formData.append("files", file);

        const res = await fetch(`/api/documents?session_id=${sessionId}`, {
          method: "POST",
          body: formData,
        });

        await parseResponseSafe(res);
      }

      setStatusMessage(`Successfully loaded ${fileList.length} document(s).`);
      onUploadSuccess();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      setIsError(true);
      setStatusMessage(err instanceof Error ? err.message : "Error uploading files.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    setIsError(false);
    setStatusMessage("Loading sample documents...");

    try {
      const res = await fetch(`/api/demo-docs?session_id=${sessionId}`, {
        method: "POST",
      });

      const data = await parseResponseSafe(res);
      setStatusMessage(`Loaded sample documents successfully.`);
      onUploadSuccess();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      setIsError(true);
      setStatusMessage(err instanceof Error ? err.message : "Error loading sample documents.");
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <aside className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
      {/* Upload Zone Card */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 p-4 shadow-sm backdrop-blur-sm transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Files className="h-4 w-4 text-stone-700 dark:text-stone-300" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Documents</h2>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {files.length} active
          </span>
        </div>

        {/* Drag & Drop Container */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-all ${
            isDragging
              ? "border-stone-900 dark:border-stone-300 bg-stone-100 dark:bg-stone-800/40"
              : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-950/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md,.csv"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
                {isUploading ? "Processing documents..." : "Upload your documents"}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                PDF, DOCX, TXT, Markdown
              </p>
            </div>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`mt-3 rounded-lg border p-2.5 text-xs flex items-start gap-2 ${
              isError
                ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                : "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {isError ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Demo Dataset Quick Action */}
        <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800/80">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={isLoadingDemo || isUploading}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/60 px-3 py-2 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {isLoadingDemo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-600 dark:text-stone-400" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>Load Sample Documents</span>
          </button>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 p-4 shadow-sm backdrop-blur-sm transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
            Uploaded Files ({files.length})
          </h3>
        </div>

        {files.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-stone-400 py-3 text-center">
            No files uploaded yet. Drag and drop files above or load sample documents.
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 mt-2">
            {files.map((fname, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-stone-800/80 bg-stone-50 dark:bg-stone-950/50 px-2.5 py-2 text-xs text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]">{fname}</span>
                </div>
                <span className="shrink-0 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 px-1.5 py-0.5 text-[10px]">
                  Ready
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
