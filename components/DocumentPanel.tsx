"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Database,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Zap,
  Sparkles,
  Layers,
  Crosshair,
  ShieldAlert,
  SearchCheck,
} from "lucide-react";

interface DocumentPanelProps {
  sessionId: string;
  files: string[];
  totalChunks: number;
  topK: number;
  setTopK: (val: number) => void;
  minScore: number;
  setMinScore: (val: number) => void;
  useHybrid: boolean;
  setUseHybrid: (val: boolean) => void;
  useRerank: boolean;
  setUseRerank: (val: boolean) => void;
  useHyde: boolean;
  setUseHyde: (val: boolean) => void;
  useCrag: boolean;
  setUseCrag: (val: boolean) => void;
  useSelfRag: boolean;
  setUseSelfRag: (val: boolean) => void;
  onUploadSuccess: () => void;
}

async function parseResponseSafe(res: Response) {
  const text = await res.text().catch(() => "");
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 413 || text.toLowerCase().includes("request entity too large")) {
      throw new Error("File exceeds serverless upload limit (4.5MB). Please upload smaller files.");
    }
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${text.slice(0, 120)}`);
    }
    throw new Error(`Unexpected server response: ${text.slice(0, 120)}`);
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
  topK,
  setTopK,
  minScore,
  setMinScore,
  useHybrid,
  setUseHybrid,
  useRerank,
  setUseRerank,
  useHyde,
  setUseHyde,
  useCrag,
  setUseCrag,
  useSelfRag,
  setUseSelfRag,
  onUploadSuccess,
}: DocumentPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setIsError(false);

    const fileList = Array.from(selectedFiles);
    let totalAddedChunks = 0;
    let successfulFiles = 0;

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        // Client-side file size check for Serverless 4.5MB limit
        if (file.size > 4.5 * 1024 * 1024) {
          throw new Error(`"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB, exceeding the 4.5MB limit. Please upload smaller documents.`);
        }

        setStatusMessage(`Processing (${i + 1}/${fileList.length}): ${file.name}...`);

        const formData = new FormData();
        formData.append("files", file);

        const res = await fetch(`/api/documents?session_id=${sessionId}`, {
          method: "POST",
          body: formData,
        });

        const data = await parseResponseSafe(res);
        totalAddedChunks += data.totalChunks || 0;
        successfulFiles++;
      }

      setStatusMessage(`Indexed ${fileList.length} document(s) successfully.`);
      onUploadSuccess();
      setTimeout(() => setStatusMessage(null), 4000);
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
    setStatusMessage("Ingesting sample documents...");

    try {
      const res = await fetch(`/api/demo-docs?session_id=${sessionId}`, {
        method: "POST",
      });

      const data = await parseResponseSafe(res);
      setStatusMessage(`Loaded ${data.documentsCount} sample documents (${data.totalChunks} chunks).`);
      onUploadSuccess();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      setIsError(true);
      setStatusMessage(err instanceof Error ? err.message : "Error loading demo dataset.");
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
            <Database className="h-4 w-4 text-stone-700 dark:text-stone-300" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Knowledge Base</h2>
          </div>
          <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
            {totalChunks} Chunks
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
            accept=".pdf,.docx,.doc,.txt,.md,.csv,.json"
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
                {isUploading ? "Extracting & Indexing..." : "Click to upload or drag files"}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                PDF, DOCX, TXT, MD, CSV (Max 4.5MB/file)
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
              <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>Load 14 Sample Technical Documents</span>
          </button>
        </div>
      </div>

      {/* Advanced RAG Architecture Controls */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 p-4 shadow-sm backdrop-blur-sm transition-colors">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-stone-700 dark:text-stone-300" />
            <span>Advanced RAG Architecture</span>
          </div>
          {showSettings ? (
            <ChevronUp className="h-4 w-4 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-400" />
          )}
        </button>

        {showSettings && (
          <div className="mt-3.5 space-y-3.5 text-xs text-stone-700 dark:text-stone-300 pt-3 border-t border-stone-200 dark:border-stone-800/80">
            {/* Feature Toggles */}
            <div className="space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">Hybrid Search (BM25 + RRF)</span>
                </div>
                <input
                  type="checkbox"
                  checked={useHybrid}
                  onChange={(e) => setUseHybrid(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-800"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">Cross-Encoder Reranking</span>
                </div>
                <input
                  type="checkbox"
                  checked={useRerank}
                  onChange={(e) => setUseRerank(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-800"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">HyDE Query Expansion</span>
                </div>
                <input
                  type="checkbox"
                  checked={useHyde}
                  onChange={(e) => setUseHyde(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-800"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">CRAG Document Grading</span>
                </div>
                <input
                  type="checkbox"
                  checked={useCrag}
                  onChange={(e) => setUseCrag(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-800"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <SearchCheck className="h-3.5 w-3.5 text-teal-500" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">Self-RAG Grounding Check</span>
                </div>
                <input
                  type="checkbox"
                  checked={useSelfRag}
                  onChange={(e) => setUseSelfRag(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-800"
                />
              </label>
            </div>

            {/* Sliders */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60 space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-stone-500 dark:text-stone-400">Top-K Passages:</span>
                  <span className="font-mono text-stone-800 dark:text-stone-200">{topK}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-stone-900 dark:accent-stone-100"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-stone-500 dark:text-stone-400">Relevance Threshold:</span>
                  <span className="font-mono text-stone-800 dark:text-stone-200">{(minScore * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-stone-900 dark:accent-stone-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Indexed Documents List */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 p-4 shadow-sm backdrop-blur-sm transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Active Documents ({files.length})
            </h3>
          </div>
        </div>

        {files.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-stone-400 py-3 text-center">
            No documents in this session yet. Upload a file or load sample documents above.
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 mt-2">
            {files.map((fname, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-stone-800/80 bg-stone-50 dark:bg-stone-950/50 px-2.5 py-2 text-xs text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]">{fname}</span>
                </div>
                <span className="shrink-0 rounded bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-600 dark:text-stone-400 font-mono">
                  Indexed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
