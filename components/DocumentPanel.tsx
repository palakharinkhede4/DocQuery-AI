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
} from "lucide-react";

interface DocumentPanelProps {
  sessionId: string;
  files: string[];
  totalChunks: number;
  topK: number;
  setTopK: (val: number) => void;
  minScore: number;
  setMinScore: (val: number) => void;
  onUploadSuccess: () => void;
}

export function DocumentPanel({
  sessionId,
  files,
  totalChunks,
  topK,
  setTopK,
  minScore,
  setMinScore,
  onUploadSuccess,
}: DocumentPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setIsError(false);
    setStatusMessage(`Processing ${selectedFiles.length} document(s)...`);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    try {
      const res = await fetch(`/api/documents?session_id=${sessionId}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to process documents.");
      }

      setStatusMessage(`Successfully indexed ${data.totalChunks} chunks from ${data.documentsCount} file(s).`);
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
    setStatusMessage("Ingesting 14 technical demo documents...");

    try {
      const res = await fetch(`/api/demo-docs?session_id=${sessionId}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to load sample dataset.");
      }

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
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100">Knowledge Base</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
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
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-blue-400">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">
                {isUploading ? "Extracting & Indexing..." : "Click to upload or drag files"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                PDF, DOCX, TXT, MD, CSV (Max 25MB)
              </p>
            </div>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`mt-3 rounded-lg border p-2.5 text-xs flex items-start gap-2 ${
              isError
                ? "border-red-900/50 bg-red-950/30 text-red-300"
                : "border-emerald-900/50 bg-emerald-950/30 text-emerald-300"
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
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={isLoadingDemo || isUploading}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
          >
            {isLoadingDemo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-blue-400" />
            )}
            <span>Load 14 Sample Technical Documents</span>
          </button>
        </div>
      </div>

      {/* Active Indexed Documents List */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Active Documents ({files.length})
            </h3>
          </div>
        </div>

        {files.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            No documents in this session yet. Upload a file or load sample documents above.
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 mt-2">
            {files.map((fname, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/50 px-2.5 py-2 text-xs text-slate-300 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]">{fname}</span>
                </div>
                <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                  Indexed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retrieval Engine Settings (Collapsible) */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-400" />
            <span>Retrieval Parameters</span>
          </div>
          {showSettings ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {showSettings && (
          <div className="mt-3.5 space-y-4 text-xs text-slate-300 pt-3 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Top-K Passages:</span>
                <span className="font-mono text-slate-200">{topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Fast (1)</span>
                <span>Balanced (4)</span>
                <span>Deep (8)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Relevance Threshold:</span>
                <span className="font-mono text-slate-200">{(minScore * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Permissive (10%)</span>
                <span>Strict (80%)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
