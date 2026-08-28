"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Github,
  Linkedin,
  Globe,
  Download,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Crosshair,
  Filter,
  FileText,
  Sun,
  Moon,
  ExternalLink,
  Code2,
  Zap,
} from "lucide-react";

export default function AboutPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("docquery_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
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

  const stages = [
    {
      step: "01",
      name: "HyDE Query Expansion",
      badge: "Pre-Retrieval",
      icon: Sparkles,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      description:
        "Generates a hypothetical technical passage answering the question to project the search vector from the 'question space' into the dense textbook 'answer space'.",
    },
    {
      step: "02",
      name: "Hybrid Retrieval (BM25 + Dense Vectors)",
      badge: "Multi-Modal Retrieval",
      icon: Layers,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 border-blue-500/20",
      description:
        "Executes dual search in parallel: BM25 Okapi with N-gram phrase boosting for exact code identifiers and syntax, combined with FAISS / Gemini embeddings for conceptual semantics.",
    },
    {
      step: "03",
      name: "Reciprocal Rank Fusion (RRF, k=60)",
      badge: "Rank Aggregation",
      icon: Cpu,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10 border-indigo-500/20",
      description:
        "Merges discrete sparse and dense candidate ranks using scale-invariant reciprocal scoring (RRF = 1 / (60 + rank)), preventing score scale mismatch without manual tuning.",
    },
    {
      step: "04",
      name: "Cross-Encoder Multi-Pass Reranking",
      badge: "Attention Rescoring",
      icon: Crosshair,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10 border-purple-500/20",
      description:
        "Evaluates full token-level cross-attention across Query-Passage pairs using ms-marco-MiniLM-L-6-v2, ensuring the most precise conceptual paragraphs rank at the top.",
    },
    {
      step: "05",
      name: "Corrective RAG (CRAG) Noise Filter",
      badge: "Document Grading",
      icon: Filter,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      description:
        "Grades candidate chunks and actively filters out Syllabus pages, Table of Contents keyword hubs, and irrelevant course outlines before prompt construction.",
    },
    {
      step: "06",
      name: "Reason-First Structured Generation",
      badge: "LLM Synthesis",
      icon: FileText,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10 border-teal-500/20",
      description:
        "Formats responses with an Executive Summary, Mechanism Deep Dive, Key Specifications, Code Blocks, and strict in-line citations with negative anti-tangent constraints.",
    },
    {
      step: "07",
      name: "Self-RAG Grounding Verification",
      badge: "Post-Generation Validation",
      icon: ShieldCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10 border-green-500/20",
      description:
        "Analyzes the output against retrieved source context to measure factual term support and verify that every single statement is anchored in the uploaded documents.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-100/50 dark:bg-[#0c0a09] transition-colors">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 dark:border-stone-800/90 bg-stone-100/80 dark:bg-stone-950/80 backdrop-blur-md px-6 py-3.5 transition-colors">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Assistant</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-stone-600" />
              )}
            </button>

            <a
              href="https://github.com/palakharinkhede4/DocQuery-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 px-3 py-1.5 text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-sm"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub Repo</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4 text-center sm:text-left max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 bg-stone-200/50 dark:bg-stone-800/50 px-3 py-1 text-xs font-medium text-stone-700 dark:text-stone-300">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>State-of-the-Art Technical RAG Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            DocQuery AI — Enterprise Document Intelligence
          </h1>
          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 leading-relaxed">
            A high-precision Retrieval-Augmented Generation (RAG) platform engineered to extract accurate, verified answers from complex technical textbooks, documentation, and research papers with zero hallucinations.
          </p>
        </section>

        {/* Creator / Owner Profile Card */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 p-6 sm:p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Profile Image */}
              <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border-2 border-stone-300 dark:border-stone-700 shadow-md">
                <img
                  src="/palak.jpg"
                  alt="Palak Harinkhede"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                    Palak Harinkhede
                  </h2>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                    Creator & Author
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium">
                  AI/ML & Full-Stack Systems Engineer
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-300 max-w-lg leading-relaxed pt-1">
                  Passionate about building production-grade LLM architectures, multi-agent AI pipelines, semantic search engines, and scalable edge systems.
                </p>
              </div>
            </div>

            {/* Social & Contact Links */}
            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              <a
                href="https://palakharinkhede4.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50 dark:bg-purple-950/40 px-4 py-2.5 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors shadow-sm"
              >
                <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Portfolio</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="https://www.linkedin.com/in/palakharinkhede/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-sm"
              >
                <Linkedin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>LinkedIn</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="https://github.com/palakharinkhede4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 px-4 py-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors shadow-sm"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="/Advanced_RAG_Architecture_and_Interview_Masterclass.pdf"
                download
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Masterclass PDF</span>
              </a>
            </div>
          </div>
        </section>

        {/* Complete Architecture Pipeline Section */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              7-Stage Multi-Stage Retrieval Architecture
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              How DocQuery AI processes each user query to eliminate false positives and formulate verified technical answers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((stg, i) => {
              const Icon = stg.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-stone-200 dark:border-stone-800/80 bg-white dark:bg-stone-900/50 p-5 space-y-3 shadow-sm hover:border-stone-400 dark:hover:border-stone-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-stone-400 dark:text-stone-500">
                      STAGE {stg.step}
                    </span>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${stg.bgColor} ${stg.color}`}>
                      {stg.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${stg.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stg.color}`} />
                    </div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {stg.name}
                    </h3>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {stg.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Real-World Case Study & Solved Edge Cases */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-stone-900/60 p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-purple-500" />
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Production Case Study: Defeating the "Syllabus/TOC Keyword Hub"
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Why traditional RAG fails on academic textbooks and how our engine permanently resolves it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-2">
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                The Failure Mode in Naive RAG
              </h3>
              <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                In multi-page textbooks, the Syllabus and Table of Contents pages list every single keyword taught in the course in a dense format. Naive BM25 and vector search match these index pages with high scores, filling all top-K slots with index outlines instead of actual explanatory chapters.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-2">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Our Algorithmic Solution
              </h3>
              <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                We implemented automatic structural TOC de-biasing, N-gram phrase boosting (+12.0), Section Heading matching (+15.0), and morphological technical stemming. Explanatory definitions and code blocks now surge directly to Rank #1.
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Technology Stack & Infrastructure
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-3.5 space-y-1">
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Frontend</span>
              <span className="text-stone-500 dark:text-stone-400">Next.js 14, React 18, Tailwind CSS</span>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-3.5 space-y-1">
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">LLM Engine</span>
              <span className="text-stone-500 dark:text-stone-400">Gemini 2.0 Flash / 1.5 Flash</span>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-3.5 space-y-1">
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Reranker</span>
              <span className="text-stone-500 dark:text-stone-400">ms-marco-MiniLM-L-6-v2</span>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-3.5 space-y-1">
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Hybrid Vector Store</span>
              <span className="text-stone-500 dark:text-stone-400">BM25 Okapi + FAISS / Cosine Sim</span>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="border-t border-stone-200 dark:border-stone-800/80 pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
          <p>© 2026 DocQuery AI. Engineered by <strong>Palak Harinkhede</strong>.</p>
          <div className="flex items-center gap-4">
            <a href="https://palakharinkhede4.github.io/" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Portfolio
            </a>
            <a href="https://www.linkedin.com/in/palakharinkhede/" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              LinkedIn
            </a>
            <a href="https://github.com/palakharinkhede4/DocQuery-AI" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Repository
            </a>
            <Link href="/" className="font-medium text-stone-900 dark:text-stone-100 hover:underline">
              Launch Assistant &rarr;
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
