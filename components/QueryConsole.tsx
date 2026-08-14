"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft, Loader2, BookOpen } from "lucide-react";

interface QueryConsoleProps {
  onAsk: (query: string) => void;
  isLoading: boolean;
  hasDocuments: boolean;
}

const SAMPLE_QUERIES = [
  "How does the Transformer self-attention mechanism calculate query-key weights?",
  "What is the difference between supervised and unsupervised learning?",
  "Explain the core components of a rainwater harvesting and collection system.",
  "How does gradient descent optimization update model parameters?",
  "What regularization techniques prevent overfitting in deep neural networks?",
  "What is the role of Docker containerization and Dockerfiles in deployment?",
];

export function QueryConsole({
  onAsk,
  isLoading,
  hasDocuments,
}: QueryConsoleProps) {
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;
    onAsk(query.trim());
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSample = (sample: string) => {
    setQuery(sample);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  return (
    <div className="space-y-3">
      {/* Sample Query Suggestions */}
      {!hasDocuments && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Suggested Technical Queries
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sq)}
                className="text-left rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100 transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Query Input Box */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end rounded-xl border border-slate-800/90 bg-slate-900/80 p-2 shadow-lg focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/80 transition-all backdrop-blur-sm"
      >
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a technical question about your indexed documents..."
          rows={1}
          disabled={isLoading}
          className="max-h-32 w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
        />

        <div className="flex items-center gap-1.5 pb-1 pr-1">
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" /> Press Enter to query, Shift+Enter for newline
        </span>
        <span>Strict Context Grounding</span>
      </div>
    </div>
  );
}
