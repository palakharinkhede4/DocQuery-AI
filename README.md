# Document Q&A RAG System

## 🚀 Overview
A Retrieval-Augmented Generation (RAG) system that allows users to query any document type (PDF, DOCX, TXT, MD) using FAISS semantic vector search and Google Gemini LLM generation.

## 🧠 Features
- Session-isolated document parsing & chunking
- FAISS-based vector search with BGE embeddings
- LLM Integration (Google Gemini Flash / Groq / Fallback)
- Interactive document upload & progress tracking
- FastAPI backend & Streamlit frontend

## 🏗️ Architecture
User Query → Retriever (FAISS) → Relevant Chunks → LLM Engine (Gemini) → Answer

## ⚙️ Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt