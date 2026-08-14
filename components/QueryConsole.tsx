"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft, Loader2 } from "lucide-react";

interface QueryConsoleProps {
  onAsk: (query: string) => void;
  isLoading: boolean;
}

export function QueryConsole({
  onAsk,
  isLoading,
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  return (
    <div className="space-y-3">
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
