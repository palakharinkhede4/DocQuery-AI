"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { DocumentPanel } from "@/components/DocumentPanel";
import { QueryConsole } from "@/components/QueryConsole";
import { MessageThread } from "@/components/MessageThread";
import { QueryResponse, SessionStats } from "@/lib/types";

function generateSessionId(): string {
  return "session_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}

async function parseResponseSafe<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 413 || text.toLowerCase().includes("request entity too large")) {
      throw new Error("Uploaded content is too large (max 4.5MB). Please upload smaller files.");
    }
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    throw new Error("Unexpected server response.");
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);

  const [history, setHistory] = useState<QueryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Initialize Session ID & Theme on mount
  useEffect(() => {
    let sid = localStorage.getItem("docquery_session_id");
    if (!sid) {
      sid = generateSessionId();
      localStorage.setItem("docquery_session_id", sid);
    }
    setSessionId(sid);

    const savedTheme = localStorage.getItem("docquery_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("docquery_theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const refreshStats = useCallback(async (sid = sessionId) => {
    if (!sid) return;
    try {
      const res = await fetch(`/api/documents?session_id=${sid}`);
      if (res.ok) {
        const stats = await parseResponseSafe<SessionStats>(res);
        setFiles(stats.files || []);
        setTotalChunks(stats.totalChunks || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch session stats:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      refreshStats(sessionId);
    }
  }, [sessionId, refreshStats]);

  const handleResetSession = async () => {
    if (isResetting || !sessionId) return;
    setIsResetting(true);

    try {
      await fetch(`/api/documents?session_id=${sessionId}`, {
        method: "DELETE",
      });

      const newSid = generateSessionId();
      localStorage.setItem("docquery_session_id", newSid);
      setSessionId(newSid);
      setFiles([]);
      setTotalChunks(0);
      setHistory([]);
    } catch (err) {
      console.error("Failed to reset session:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    setActiveQuery(queryText);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryText,
          top_k: 4,
          min_score: 0.20,
          session_id: sessionId,
          use_hybrid: true,
          use_reranking: true,
          use_hyde: false,
          use_crag: true,
          use_self_rag: true,
        }),
      });

      const data = await parseResponseSafe<QueryResponse>(res);
      setHistory((prev) => [data, ...prev]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error finding answer.";
      setHistory((prev) => [
        {
          query: queryText,
          answer: `Error: ${errorMsg}`,
          sources: [],
          modelUsed: "Error",
          latencyMs: 0,
          session_id: sessionId,
        },
        ...prev,
      ]);
    } finally {
      setIsLoading(false);
      setActiveQuery(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100/50 dark:bg-[#0c0a09] transition-colors">
      {/* Top Navigation Bar */}
      <Header
        sessionId={sessionId}
        totalChunks={totalChunks}
        totalDocs={files.length}
        onResetSession={handleResetSession}
        isResetting={isResetting}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Split Layout */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Document Management Panel */}
          <DocumentPanel
            sessionId={sessionId}
            files={files}
            totalChunks={totalChunks}
            onUploadSuccess={() => refreshStats(sessionId)}
          />

          {/* Right Query & Results Thread */}
          <section className="flex-1 w-full space-y-4">
            {/* Query Console */}
            <QueryConsole
              onAsk={handleAsk}
              isLoading={isLoading}
            />

            {/* Conversation History / Results Thread */}
            <MessageThread
              history={history}
              isLoading={isLoading}
              activeQuery={activeQuery}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
