# Local RAG System for Technical Document QnA

## 🚀 Overview
A local Retrieval-Augmented Generation (RAG) system that allows users to query technical documents using semantic search and a local LLM.

## 🧠 Features
- Document chunking
- FAISS-based vector search
- Sentence-transformer embeddings
- Local LLM (TinyLlama)
- FastAPI backend
- Streamlit frontend

## 🏗️ Architecture
User Query → Retriever (FAISS) → Relevant Chunks → LLM → Answer

## ⚙️ Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt