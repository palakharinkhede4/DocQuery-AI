"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { DocumentPanel } from "@/components/DocumentPanel";
import { QueryConsole } from "@/components/QueryConsole";
import { MessageThread } from "@/components/MessageThread";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { QueryResponse, SessionStats } from "@/lib/types";

function generateSessionId(): string {
  return "session_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [topK, setTopK] = useState(4);
  const [minScore, setMinScore] = useState(0.25);
  const [history, setHistory] = useState<QueryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  // Initialize Session & local storage API key on mount
  useEffect(() => {
    let sid = localStorage.getItem("docquery_session_id");
    if (!sid) {
      sid = generateSessionId();
      localStorage.setItem("docquery_session_id", sid);
    }
    setSessionId(sid);

    const savedKey = localStorage.getItem("docquery_custom_gemini_key") || "";
    setApiKey(savedKey);
  }, []);

  const refreshStats = useCallback(async (sid = sessionId) => {
    if (!sid) return;
    try {
      const res = await fetch(`/api/documents?session_id=${sid}`);
      if (res.ok) {
        const stats: SessionStats = await res.json();
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

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("docquery_custom_gemini_key", key);
  };

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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["x-gemini-api-key"] = apiKey;
      }

      const res = await fetch("/api/ask", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: queryText,
          top_k: topK,
          min_score: minScore,
          session_id: sessionId,
        }),
      });

      const data: QueryResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error || "Query execution failed.");
      }

      setHistory((prev) => [data, ...prev]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error executing query.";
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
    <div className="min-h-screen flex flex-col bg-[#080d1a]">
      {/* Top Navigation Bar */}
      <Header
        sessionId={sessionId}
        totalChunks={totalChunks}
        totalDocs={files.length}
        onResetSession={handleResetSession}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasCustomKey={Boolean(apiKey)}
        isResetting={isResetting}
      />

      {/* Main Split Layout */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Document Management Panel */}
          <DocumentPanel
            sessionId={sessionId}
            files={files}
            totalChunks={totalChunks}
            topK={topK}
            setTopK={setTopK}
            minScore={minScore}
            setMinScore={setMinScore}
            onUploadSuccess={() => refreshStats(sessionId)}
            apiKey={apiKey}
          />

          {/* Right Query & Results Thread */}
          <section className="flex-1 w-full space-y-6">
            {/* Query Console */}
            <QueryConsole
              onAsk={handleAsk}
              isLoading={isLoading}
              hasDocuments={files.length > 0}
            />

            {/* Conversation History / Results */}
            <MessageThread
              history={history}
              isLoading={isLoading}
              activeQuery={activeQuery}
            />
          </section>
        </div>
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaveKey={handleSaveApiKey}
        currentKey={apiKey}
      />
    </div>
  );
}
