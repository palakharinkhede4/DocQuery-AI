from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.pipeline import run_pipeline
from src.ingest import ingest_file_objects, ingest_directory
from src.vectorstore import get_vector_store

app = FastAPI(
    title="Local Technical Document Q&A RAG API",
    description="100% Local & Privacy-Preserving RAG API with FAISS Vector Search and Local LLM Generation",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4


@app.get("/")
def home():
    return {
        "message": "Local RAG API running 🚀 (100% Offline & Private)",
        "vector_store": "FAISS",
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    vstore = get_vector_store()
    doc_stats = vstore.get_documents()
    return {
        "status": "healthy",
        "vector_store_type": "FAISS",
        "mode": "100% Local & Offline",
        "stats": doc_stats
    }


@app.post("/ask")
def ask_question(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
    result = run_pipeline(req.query, top_k=req.top_k or 4)
    return result


@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    file_objects = []
    for file in files:
        content = await file.read()
        file_objects.append({
            "name": file.filename,
            "content": content
        })

    result = ingest_file_objects(file_objects)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))

    return result


@app.post("/ingest-demo")
def ingest_demo_docs():
    """Ingest 12 pre-loaded technical demo documents from data/docs."""
    return ingest_directory()


@app.get("/documents")
def list_documents():
    vstore = get_vector_store()
    return vstore.get_documents()


@app.delete("/documents")
def clear_documents():
    vstore = get_vector_store()
    vstore.clear()
    return {"message": "Document index cleared successfully."}