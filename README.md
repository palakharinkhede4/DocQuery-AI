# DocQuery AI — Advanced Multi-Stage RAG & Technical Document Intelligence Platform

DocQuery AI is a state-of-the-art, high-performance **Retrieval-Augmented Generation (RAG)** platform designed for technical document question-answering and deep knowledge extraction. Engineered with modern research-backed techniques (Hybrid Retrieval, RRF, Cross-Encoder Reranking, HyDE, Corrective RAG, and Self-RAG Grounding), it provides unparalleled precision, structured technical explanations, and zero hallucinations.

---

## 🚀 Advanced RAG Architecture

```
                                  User Technical Query
                                            │
                                            ▼
                  ┌───────────────────────────────────────────────────┐
                  │ 1. HyDE Query Expansion                           │
                  │    - Generates hypothetical technical passage     │
                  │    - Bridges semantic question-answer domain gap  │
                  └─────────────────────────┬─────────────────────────┘
                                            │
                       ┌────────────────────┴────────────────────┐
                       ▼                                         ▼
         ┌───────────────────────────┐             ┌───────────────────────────┐
         │ 2a. Sparse Lexical Search │             │ 2b. Dense Vector Search   │
         │     - BM25 Okapi Scoring  │             │     - FAISS / Cosine Sim  │
         │     - Exact keyword match │             │     - BGE / Gemini Embeds │
         └─────────────┬─────────────┘             └─────────────┬─────────────┘
                       │                                         │
                       └────────────────────┬────────────────────┘
                                            ▼
                  ┌───────────────────────────────────────────────────┐
                  │ 3. Reciprocal Rank Fusion (RRF, k=60)             │
                  │    - Merges sparse & dense ranks mathematically   │
                  └─────────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                  ┌───────────────────────────────────────────────────┐
                  │ 4. Cross-Encoder Multi-Pass Reranking             │
                  │    - Joint Query-Doc Cross-Attention Scoring      │
                  │    - ms-marco-MiniLM-L-6-v2 deep rescoring        │
                  └─────────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                  ┌───────────────────────────────────────────────────┐
                  │ 5. Corrective RAG (CRAG) Document Grading         │
                  │    - Classifies chunks: RELEVANT / IRRELEVANT     │
                  │    - Eliminates conflicting noise & headers       │
                  └─────────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                  ┌───────────────────────────────────────────────────┐
                  │ 6. SOTA Reason-First Structured Generator         │
                  │    - Executive Summary + Mechanism Deep-Dive      │
                  │    - In-line [Source: Doc (Page X)] Citations     │
                  │    - Strict Topic Containment (Anti-tangent)      │
                  └─────────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                  ┌───────────────────────────────────────────────────┐
                  │ 7. Self-RAG Faithfulness & Grounding Check        │
                  │    - Verifies factual support against citations   │
                  │    - Computes verification confidence badge       │
                  └─────────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                   Verified Technical Response + Source Passages + Trace
```

---

## ⚡ Core Advanced Features

1. **Hybrid Retrieval (BM25 Okapi + Dense Vectors)**:
   - Eliminates vector-only blind spots by pairing BM25 keyword matching (for exact technical identifiers, functions, acronyms) with dense embeddings.
2. **Reciprocal Rank Fusion (RRF, $k=60$)**:
   - Seamlessly blends ranking scores across search modalities without score calibration issues.
3. **Cross-Encoder Reranking (`ms-marco-MiniLM-L-6-v2`)**:
   - Performs joint cross-attention over query-document pairs to ensure the most pertinent chunks are at the top.
4. **Hypothetical Document Embeddings (HyDE)**:
   - Generates a domain-specific hypothetical answer snippet, searching in the document answer-space rather than query-space.
5. **Corrective RAG (CRAG)**:
   - Evaluates retrieved passages, grades their relevance, and filters out noise or unrelated syllabus headers.
6. **Self-RAG Grounding & Faithfulness Verification**:
   - Validates that claims in the output are grounded in the retrieved context, emitting confidence metrics.
7. **SOTA Chain-of-Evidence Prompting**:
   - Formulates responses with an Executive Summary, Mechanism Deep Dive, Key Specifications, Limitations, and in-line citations.
8. **Interactive Pipeline Inspector**:
   - Collapsible UI trace showing HyDE query expansions, hybrid fusion ranks, rerank scores, CRAG grades, and latency.

---

## 🛠️ Deploy to Vercel (Next.js Fullstack)

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Deploy Advanced Multi-Stage RAG Architecture"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** > **"Project"** and select `Local-RAG-System-for-Technical-Document-QnA`.
3. Set Environment Variable:
   - `GEMINI_API_KEY`: `AIzaSy...` ([Get free key at Google AI Studio](https://aistudio.google.com/app/apikey))
4. Click **Deploy**.

---

## 💻 Local Development

### Option A: Next.js Fullstack Web App
```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: Python Streamlit & FastAPI Backend
```bash
# 1. Activate Python virtual environment
.\venv\Scripts\activate

# 2. Run FastAPI backend
uvicorn src.backend:app --reload --port 8000

# 3. In another terminal, run Streamlit UI
streamlit run frontend/app.py
```

### Run Python Unit Tests
```bash
.\venv\Scripts\python.exe -m unittest tests/test_pipeline.py
```

---

## 📁 Repository Structure

```
├── app/
│   ├── api/
│   │   ├── ask/route.ts          # Advanced RAG pipeline query endpoint
│   │   ├── demo-docs/route.ts    # 1-click sample technical dataset loader
│   │   ├── documents/route.ts    # Multipart file upload and session vector manager
│   │   └── health/route.ts       # Health checks and session metrics
│   ├── globals.css               # Design tokens, typography, and theme styling
│   ├── layout.tsx                # Master page layout and metadata
│   └── page.tsx                  # Client workspace with split layout and RAG controls
├── components/
│   ├── DocumentPanel.tsx         # Drag-and-drop uploader & Advanced RAG toggles
│   ├── Header.tsx                # Enterprise top bar with session and status pills
│   ├── MessageThread.tsx         # Markdown response thread & RAG Execution Inspector
│   └── QueryConsole.tsx          # Query input box & starter prompts
├── lib/
│   ├── demo-data.ts              # Pre-bundled technical knowledge base
│   ├── generator.ts              # Gemini API, SOTA prompt engine & Self-RAG verifier
│   ├── parsers.ts                # PDF, DOCX, TXT parsers & text chunker
│   ├── types.ts                  # TypeScript interfaces (AdvancedRAGConfig, PipelineTrace)
│   └── vector-store.ts           # Hybrid BM25 + Gemini Dense + RRF + Cross-Scorer + CRAG
├── src/
│   ├── advanced_rag.py           # BM25Index, RRF, CrossEncoder, HyDE, CRAG, SelfRAG
│   ├── backend.py                # FastAPI REST API with Advanced RAG schema
│   ├── generator.py              # SOTA Chain-of-Evidence Prompting & LLM orchestration
│   ├── ingest.py                 # Multi-format document parser & batch embedder
│   ├── parsers.py                # OCR repair, pypdf & docx parsers
│   ├── pipeline.py               # End-to-end Advanced RAG orchestrator
│   ├── retriever.py              # Multi-stage retrieval coordinator
│   └── vectorstore.py            # FAISS + BM25 session-isolated hybrid vector store
├── frontend/
│   └── app.py                    # Streamlit interface with RAG Architecture toggles & Inspector
└── tests/
    └── test_pipeline.py          # Unit tests for BM25, RRF, CRAG, Self-RAG, and Pipeline
```