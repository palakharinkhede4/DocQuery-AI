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
  Layers,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Crosshair,
  Search,
  Activity,
} from "lucide-react";
import { QueryResponse } from "@/lib/types";

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
  const [expandedTraces, setExpandedTraces] = useState<Record<number, boolean>>({});

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

  const toggleTrace = (index: number) => {
    setExpandedTraces((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (history.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800/80 bg-white dark:bg-stone-900/40 p-8 text-center backdrop-blur-sm transition-colors">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 mb-3">
          <BookOpen className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Advanced RAG Intelligence Console Ready
        </h3>
        <p className="max-w-md text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
          Upload technical documents or load the 14-doc dataset to run multi-stage queries with Hybrid BM25, Cross-Encoder Reranking, CRAG Grading, and Self-RAG verification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active in-flight Query Loading indicator */}
      {isLoading && activeQuery && (
        <div className="rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 p-4 space-y-2 animate-pulse transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
            <span>Executing Multi-Stage RAG Pipeline</span>
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{activeQuery}</p>
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>Hybrid Search &rarr; Cross-Encoder Reranking &rarr; CRAG Grading &rarr; Structured Synthesis...</span>
          </div>
        </div>
      )}

      {/* History Items */}
      {history.map((item, idx) => {
        const isSourcesOpen = expandedSources[idx] ?? false;
        const isTraceOpen = expandedTraces[idx] ?? false;
        const trace = item.pipelineTrace;
        const selfRag = item.selfRag;

        return (
          <div
            key={idx}
            className="rounded-xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 shadow-sm backdrop-blur-sm overflow-hidden transition-colors"
          >
            {/* User Question Header */}
            <div className="border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-950/40 px-5 py-3 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Query #{history.length - idx}
                  </span>
                  {selfRag && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Self-RAG: {selfRag.verdict} ({Math.round(selfRag.groundingScore * 100)}%)</span>
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {item.query}
                </h3>
              </div>

              {/* Latency, Model & Copy Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-mono text-stone-500 dark:text-stone-400">
                  <Clock className="h-3 w-3" />
                  <span>{item.latencyMs}ms</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(item.answer, idx)}
                  title="Copy answer to clipboard"
                  className="rounded p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                >
                  {copiedIndex === idx ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Answer Content */}
            <div className="p-5 text-sm">
              <div className="prose-doc max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.answer}
                </ReactMarkdown>
              </div>
            </div>

            {/* Interactive RAG Pipeline Inspector */}
            {trace && (
              <div className="border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/30 dark:bg-stone-950/20 px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleTrace(idx)}
                  className="flex w-full items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-amber-500" />
                    <span>RAG Pipeline Execution Trace</span>
                  </div>
                  {isTraceOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {isTraceOpen && (
                  <div className="mt-3 space-y-2.5 pt-2 border-t border-stone-200 dark:border-stone-800/60 text-xs">
                    {/* HyDE info if active */}
                    {trace.hydeExpanded && trace.hydeQuery && (
                      <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-800 dark:text-amber-300 mb-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>HyDE Formulated Passage</span>
                        </div>
                        <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 italic font-mono">
                          {trace.hydeQuery}
                        </p>
                      </div>
                    )}

                    {/* Pipeline steps log */}
                    <div className="space-y-1 bg-stone-100 dark:bg-stone-900/90 rounded-lg p-3 border border-stone-200 dark:border-stone-800">
                      <span className="font-semibold text-[11px] text-stone-700 dark:text-stone-300 block mb-1">
                        Execution Pipeline Stages:
                      </span>
                      {trace.steps.map((s, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-1.5 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                          <span className="text-emerald-500 font-bold">&check;</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>

                    {/* CRAG Stats Badge */}
                    {trace.cragStats && (
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                        <span className="rounded bg-stone-200 dark:bg-stone-800 px-2 py-0.5">
                          Confidence: {Math.round(trace.cragStats.retrievalConfidence * 100)}%
                        </span>
                        <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
                          Verified: {trace.cragStats.relevantCount}
                        </span>
                        <span className="rounded bg-stone-200 dark:bg-stone-800 px-2 py-0.5">
                          Filtered Noise: {trace.cragStats.filteredCount}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Source Citations Drawer */}
            {item.sources && item.sources.length > 0 && (
              <div className="border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-950/30 px-5 py-3">
                <button
                  type="button"
                  onClick={() => toggleSources(idx)}
                  className="flex w-full items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
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
                  <div className="mt-3 space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800/60">
                    {item.sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-lg border border-stone-200 dark:border-stone-800/70 bg-white dark:bg-stone-900/80 p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-800 dark:text-stone-300">
                            <FileText className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
                            <span className="font-semibold">{src.source}</span>
                            <span className="text-stone-400 dark:text-stone-500">
                              (Page/Chunk {src.page})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {src.cragGrade && (
                              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 text-[9px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                                {src.cragGrade}
                              </span>
                            )}
                            <span className="rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 text-[10px] font-mono text-stone-600 dark:text-stone-400">
                              Score: {(src.score * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-stone-600 dark:text-stone-400 italic text-[11px] leading-relaxed pl-2 border-l-2 border-stone-300 dark:border-stone-700">
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
