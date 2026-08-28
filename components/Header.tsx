"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  BookOpen,
  Sun,
  Moon,
  Files,
  Info,
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
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 dark:border-stone-800/90 bg-stone-100/80 dark:bg-stone-950/80 backdrop-blur-md px-6 py-3.5 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand & Identity */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              DocQuery
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Document Assistant & Q&A
            </p>
          </div>
        </Link>

        {/* Action Controls & Session Metadata */}
        <div className="flex items-center gap-2">
          {/* Document Count Pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 px-3 py-1.5 text-xs text-stone-600 dark:text-stone-300">
            <Files className="h-3.5 w-3.5 text-stone-400" />
            <span>
              <strong className="font-semibold text-stone-900 dark:text-stone-100">{totalDocs}</strong> document{totalDocs === 1 ? "" : "s"} loaded
            </span>
          </div>

          {/* About Project Button */}
          <Link
            href="/about"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors shadow-sm"
          >
            <Info className="h-3.5 w-3.5 text-blue-500" />
            <span>About Project</span>
          </Link>

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

          {/* Clear / New Chat Button */}
          <button
            onClick={onResetSession}
            disabled={isResetting}
            title="Clear current documents and start fresh"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:border-red-300 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>
    </header>
  );
}
