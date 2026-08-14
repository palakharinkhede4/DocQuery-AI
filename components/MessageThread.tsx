"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { QueryResponse, SourceCitation } from "@/lib/types";

interface MessageThreadProps {
  history: QueryResponse[];
  isLoading: boolean;
  activeQuery: string | null;
}

export function MessageThread({
  history,
  isLoading,
  activeQuery,
}: MessageThreadProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const toggleSources = (index: number) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (history.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/30 p-8 text-center backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-4">
          <Cpu className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-100">
          Document Intelligence Console Ready
        </h3>
        <p className="max-w-md text-xs text-slate-400 mt-1.5 leading-relaxed">
          Upload technical manuals, papers, or documentation on the left, or load the pre-bundled 14-doc dataset to run semantic queries with instant source citations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active in-flight Query Loading indicator */}
      {isLoading && activeQuery && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <span>Querying Document Index</span>
          </div>
          <p className="text-sm font-medium text-slate-200">{activeQuery}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-ping" />
            <span>Retrieving context passages & generating response...</span>
          </div>
        </div>
      )}

      {/* History Items */}
      {history.map((item, idx) => {
        const isSourcesOpen = expandedSources[idx] ?? false;

        return (
          <div
            key={idx}
            className="rounded-xl border border-slate-800/80 bg-slate-900/50 shadow-md backdrop-blur-sm overflow-hidden transition-all"
          >
            {/* User Question Header */}
            <div className="border-b border-slate-800/80 bg-slate-950/40 px-5 py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-400">
                  Question #{history.length - idx}
                </span>
                <h3 className="text-sm font-semibold text-slate-100">
                  {item.query}
                </h3>
              </div>

              {/* Latency & Model Pill */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>{item.latencyMs}ms</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(item.answer, idx)}
                  title="Copy answer to clipboard"
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  {copiedIndex === idx ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Answer Content */}
            <div className="p-5 text-sm">
              <div className="prose-dark max-w-none text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.answer}
                </ReactMarkdown>
              </div>
            </div>

            {/* Source Citations Drawer */}
            {item.sources && item.sources.length > 0 && (
              <div className="border-t border-slate-800/80 bg-slate-950/30 px-5 py-3">
                <button
                  type="button"
                  onClick={() => toggleSources(idx)}
                  className="flex w-full items-center justify-between text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                    <span>
                      {item.sources.length} Context Passage
                      {item.sources.length > 1 ? "s" : ""} Referenced
                    </span>
                  </div>
                  {isSourcesOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {isSourcesOpen && (
                  <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-800/60">
                    {item.sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-lg border border-slate-800/70 bg-slate-900/80 p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                            <FileText className="h-3.5 w-3.5 text-blue-400" />
                            <span className="font-semibold">{src.source}</span>
                            <span className="text-slate-500">
                              (Page/Chunk {src.page})
                            </span>
                          </div>
                          <span className="rounded bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.5 text-[10px] font-mono text-blue-300">
                            Match: {(src.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-slate-400 italic text-[11px] leading-relaxed pl-2 border-l-2 border-slate-700">
                          &ldquo;{src.fullText}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
