# DocQuery AI — Enterprise Document Intelligence & RAG Platform

DocQuery AI is a modern, high-performance Retrieval-Augmented Generation (RAG) platform designed for technical document analysis and question answering. It is engineered with a Next.js fullstack architecture and optimized for zero-cold-start deployment on Vercel Edge/Serverless infrastructure.

---

## Architectural Highlights

- **Serverless & Edge-Ready**: Deploys natively to Vercel with zero background sleep states or container hibernation.
- **Session Isolation**: Each user session operates with dedicated vector indexing in memory.
- **Multi-Format Ingestion**: High-throughput parsing for PDF (with OCR glitch repair), DOCX, TXT, Markdown, and CSV files.
- **Hybrid Retrieval Engine**:
  - BM25 & Cosine Similarity ranking for instant precision retrieval.
  - Dense semantic embeddings via Google Gemini (`text-embedding-004`).
- **Generation Engine**: Google Gemini 2.0 Flash / 1.5 Flash integration with structured context grounding and automatic extractive fallback synthesis.
- **Modern Enterprise UI/UX**: Clean, responsive, high-contrast dark theme built with Tailwind CSS, Lucide technical iconography, and markdown syntax rendering.

---

## Deploy to Vercel (1-Click)

### Step 1: Push Code to GitHub
Ensure your repository is committed and pushed to your GitHub account:
```bash
git add .
git commit -m "Migrate to Next.js fullstack app with modern UI and Vercel deployment"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** > **"Project"**.
3. Select your `Local-RAG-System-for-Technical-Document-QnA` repository.
4. Framework Preset will automatically detect **Next.js**.

### Step 3: Configure Environment Variables
In the **Environment Variables** section on Vercel, add:
| Key | Value | Description |
|---|---|---|
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key ([Get one free at Google AI Studio](https://aistudio.google.com/app/apikey)) |

*(Note: Users can also provide their own API key directly inside the web interface via the API Configuration modal).*

### Step 4: Click Deploy
Click **Deploy**. Your application will build and deploy globally in under 60 seconds with a permanent URL that never sleeps.

---

## Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional for local testing)
cp .env.example .env.local

# 3. Launch development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── ask/route.ts          # RAG retrieval and answer generation endpoint
│   │   ├── demo-docs/route.ts    # 1-click sample technical dataset loader
│   │   ├── documents/route.ts    # Multipart upload and session vector manager
│   │   └── health/route.ts       # Health checks and session metrics
│   ├── globals.css               # Design tokens, typography, and theme styling
│   ├── layout.tsx                # Master page layout and metadata
│   └── page.tsx                  # Client workspace with split layout
├── components/
│   ├── ApiKeyModal.tsx           # Client-side API key configuration modal
│   ├── DocumentPanel.tsx         # Drag-and-drop uploader & active documents list
│   ├── Header.tsx                # Enterprise top bar with session and status pills
│   ├── MessageThread.tsx         # Markdown response thread & source citations
│   └── QueryConsole.tsx          # Query input box & suggested starter prompts
├── lib/
│   ├── demo-data.ts              # Pre-bundled technical knowledge base
│   ├── generator.ts              # Gemini API & offline extractive synthesizer
│   ├── parsers.ts                # PDF, DOCX, TXT parsers & text chunker
│   ├── types.ts                  # TypeScript interfaces
│   └── vector-store.ts           # In-memory BM25 + Gemini vector store
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS design system tokens
├── tsconfig.json                 # TypeScript compiler configuration
└── vercel.json                   # Vercel deployment specification
```

---

## API Reference

### 1. `POST /api/ask`
Execute a RAG query against the session index.
```json
{
  "query": "How does the Transformer self-attention mechanism calculate weights?",
  "top_k": 4,
  "min_score": 0.25,
  "session_id": "session_abc123"
}
```

### 2. `POST /api/documents?session_id=session_abc123`
Upload files via multipart form data (`files`).

### 3. `POST /api/demo-docs?session_id=session_abc123`
Instantly loads 14 pre-bundled technical documents into the session index.

### 4. `DELETE /api/documents?session_id=session_abc123`
Clears the session index and frees memory.