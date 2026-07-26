# DocQuery AI — Document Intelligence & RAG System

## Overview
DocQuery AI is a modern Retrieval-Augmented Generation (RAG) platform that allows users to analyze and query any document type (PDF, DOCX, TXT, MD) using FAISS semantic vector search and Google Gemini Flash AI.

## Key Features
- Session-isolated document parsing & chunking
- FAISS-based vector search with BGE embeddings
- High-performance LLM Integration (Google Gemini Flash AI)
- Production-grade UI with interactive drag-and-drop ingestion & progress tracking
- FastAPI backend & Streamlit frontend

## Architecture
User Query → Retriever (FAISS) → Relevant Chunks → Gemini Flash AI → Answer

## ⚙️ Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt