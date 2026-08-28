from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.pipeline import run_pipeline
from src.ingest import ingest_file_objects, ingest_directory
from src.vectorstore import get_vector_store, clear_session_store

app = FastAPI(
    title="DocQuery AI API",
    description="Privacy-Preserving Session-Isolated Document Intelligence RAG API with FAISS & Gemini 3.5 Flash Lite",
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
    min_score: Optional[float] = 0.35
    session_id: Optional[str] = "default_session"
    use_hybrid: Optional[bool] = True
    use_reranking: Optional[bool] = True
    use_hyde: Optional[bool] = False
    use_crag: Optional[bool] = True
    use_self_rag: Optional[bool] = True


@app.get("/")
def home():
    return {
        "message": "DocQuery AI API running (Session-Isolated RAG)",
        "vector_store": "FAISS",
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check(session_id: Optional[str] = "default_session"):
    vstore = get_vector_store(session_id=session_id)
    doc_stats = vstore.get_documents()
    return {
        "status": "healthy",
        "vector_store_type": "FAISS",
        "mode": "Session-Isolated RAG (FAISS + LLM)",
        "session_id": session_id,
        "stats": doc_stats
    }


@app.post("/ask")
def ask_question(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
    result = run_pipeline(
        query=req.query,
        top_k=req.top_k or 4,
        session_id=req.session_id,
        min_score=req.min_score if req.min_score is not None else 0.35,
        use_hybrid=req.use_hybrid if req.use_hybrid is not None else True,
        use_reranking=req.use_reranking if req.use_reranking is not None else True,
        use_hyde=req.use_hyde if req.use_hyde is not None else False,
        use_crag=req.use_crag if req.use_crag is not None else True,
        use_self_rag=req.use_self_rag if req.use_self_rag is not None else True
    )
    return result


@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Query("default_session")
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    file_objects = []
    for file in files:
        content = await file.read()
        file_objects.append({
            "name": file.filename,
            "content": content
        })

    result = ingest_file_objects(file_objects, session_id=session_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))

    return result


@app.post("/ingest-demo")
def ingest_demo_docs(session_id: Optional[str] = Query("default_session")):
    """Ingest 12 pre-loaded sample demo documents into session-isolated index."""
    return ingest_directory(session_id=session_id)


@app.get("/documents")
def list_documents(session_id: Optional[str] = Query("default_session")):
    vstore = get_vector_store(session_id=session_id)
    return vstore.get_documents()


@app.delete("/documents")
def clear_documents(session_id: Optional[str] = Query("default_session")):
    clear_session_store(session_id=session_id)
    return {"message": f"Document index for session '{session_id}' cleared successfully."}