"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  Copy,
  Check,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";

interface HeaderProps {
  sessionId: string;
  totalChunks: number;
  totalDocs: number;
  onResetSession: () => void;
  isResetting: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Header({
  sessionId,
  totalChunks,
  totalDocs,
  onResetSession,
  isResetting,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 dark:border-stone-800/90 bg-stone-100/80 dark:bg-stone-950/80 backdrop-blur-md px-6 py-3.5 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              DocQuery
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Technical Document Intelligence
            </p>
          </div>
        </div>

        {/* Action Controls & Session Metadata */}
        <div className="flex items-center gap-2">
          {/* Document Stats Pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 px-2.5 py-1.5 text-xs text-stone-600 dark:text-stone-300">
            <span>
              <strong className="font-semibold text-stone-900 dark:text-stone-100">{totalDocs}</strong> docs ({totalChunks} chunks)
            </span>
          </div>

          {/* Session ID Pill */}
          <button
            onClick={handleCopySession}
            title="Click to copy Session ID"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 px-2.5 py-1.5 text-xs font-mono text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
          >
            <span>ID: {sessionId.slice(0, 8)}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-stone-600" />
            )}
          </button>

          {/* Reset Session Button */}
          <button
            onClick={onResetSession}
            disabled={isResetting}
            title="Clear all indexed documents and reset workspace"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:border-red-300 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
