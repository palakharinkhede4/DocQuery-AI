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
  BookOpen,
  ShieldCheck,
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800/80 bg-white dark:bg-stone-900/40 p-8 text-center backdrop-blur-sm transition-colors">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 mb-3">
          <BookOpen className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          DocQuery Assistant Ready
        </h3>
        <p className="max-w-md text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
          Upload your documents on the left or click <strong>Load Sample Documents</strong> to ask questions and get accurate, verified answers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active in-flight Query Loading indicator */}
      {isLoading && activeQuery && (
        <div className="rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 p-4 space-y-2 animate-pulse transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span>Finding answer...</span>
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{activeQuery}</p>
        </div>
      )}

      {/* History Items */}
      {history.map((item, idx) => {
        const isSourcesOpen = expandedSources[idx] ?? false;

        return (
          <div
            key={idx}
            className="rounded-xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 shadow-sm backdrop-blur-sm overflow-hidden transition-colors"
          >
            {/* User Question Header */}
            <div className="border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-950/40 px-5 py-3 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Source Verified</span>
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {item.query}
                </h3>
              </div>

              {/* Latency & Copy Button */}
              <div className="flex items-center gap-2 shrink-0">
                {item.latencyMs > 0 && (
                  <div className="flex items-center gap-1 rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500 dark:text-stone-400">
                    <Clock className="h-3 w-3" />
                    <span>{(item.latencyMs / 1000).toFixed(1)}s</span>
                  </div>
                )}
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

            {/* Clean Sources Drawer */}
            {item.sources && item.sources.length > 0 && (
              <div className="border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-950/30 px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSources(idx)}
                  className="flex w-full items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
                    <span>
                      {item.sources.length} Referenced Source{item.sources.length > 1 ? "s" : ""}
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
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-800 dark:text-stone-300 font-medium">
                            <span>{src.source}</span>
                            <span className="text-stone-400 dark:text-stone-500">
                              (Page {src.page})
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
