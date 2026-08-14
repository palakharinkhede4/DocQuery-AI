"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, CornerDownLeft, Loader2 } from "lucide-react";

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
    <div className="space-y-2.5">
      {/* Main Query Input Box */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end rounded-xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900/80 p-2 shadow-sm focus-within:border-stone-500 dark:focus-within:border-stone-600 focus-within:ring-1 focus-within:ring-stone-500 dark:focus-within:ring-stone-600 transition-all backdrop-blur-sm"
      >
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a technical question about your indexed documents..."
          rows={1}
          disabled={isLoading}
          className="max-h-32 w-full resize-none bg-transparent px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none disabled:opacity-50"
        />

        <div className="flex items-center gap-1.5 pb-1 pr-1">
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 shadow-sm hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between px-1 text-[11px] text-stone-400 dark:text-stone-500 font-mono">
        <span className="flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" /> Press Enter to query, Shift+Enter for newline
        </span>
        <span>Strict Context Grounding</span>
      </div>
    </div>
  );
}
