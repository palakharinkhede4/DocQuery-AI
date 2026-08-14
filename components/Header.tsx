"use client";

import React, { useState } from "react";
import {
  Activity,
  RotateCcw,
  Key,
  Copy,
  Check,
  Cpu,
  Layers
} from "lucide-react";

interface HeaderProps {
  sessionId: string;
  totalChunks: number;
  totalDocs: number;
  onResetSession: () => void;
  onOpenApiKeyModal: () => void;
  hasCustomKey: boolean;
  isResetting: boolean;
}

export function Header({
  sessionId,
  totalChunks,
  totalDocs,
  onResetSession,
  onOpenApiKeyModal,
  hasCustomKey,
  isResetting,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3.5">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-100">
                DocQuery AI
              </h1>
              <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                v2.0 Serverless
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Session-Isolated Document Intelligence & RAG Platform
            </p>
          </div>
        </div>

        {/* Engine Status & Session Metadata */}
        <div className="flex items-center gap-2.5">
          {/* Active Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-300">Vercel Edge Active</span>
          </div>

          {/* Document Stats Pill */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>
              <strong className="text-slate-100 font-semibold">{totalDocs}</strong> docs ({totalChunks} chunks)
            </span>
          </div>

          {/* Session ID Pill */}
          <button
            onClick={handleCopySession}
            title="Click to copy Session ID"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          >
            <span>ID: {sessionId.slice(0, 8)}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {/* API Key Modal Trigger */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              hasCustomKey
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {hasCustomKey ? "Custom Key Set" : "API Config"}
            </span>
          </button>

          {/* Reset Session Button */}
          <button
            onClick={onResetSession}
            disabled={isResetting}
            title="Clear all indexed documents and reset session"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
