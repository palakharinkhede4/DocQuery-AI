from typing import Optional, Dict, Any
from src.retriever import retrieve
from src.generator import generate_answer, get_api_key
from config import (
    USE_HYBRID_SEARCH,
    USE_RERANKING,
    USE_HYDE,
    USE_CRAG,
    USE_SELF_RAG
)


def run_pipeline(
    query: str,
    top_k: int = 4,
    session_id: Optional[str] = None,
    min_score: float = 0.35,
    use_hybrid: bool = USE_HYBRID_SEARCH,
    use_reranking: bool = USE_RERANKING,
    use_hyde: bool = USE_HYDE,
    use_crag: bool = USE_CRAG,
    use_self_rag: bool = USE_SELF_RAG,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run full end-to-end Advanced RAG pipeline:
    Query -> HyDE -> Hybrid Search (BM25 + FAISS) -> RRF Fusion -> Cross-Encoder Rerank
    -> CRAG Grade -> Structured Prompt Generation -> Self-RAG Verification.
    """
    effective_api_key = api_key or get_api_key("GEMINI_API_KEY")

    retrieved_docs, trace = retrieve(
        query=query,
        top_k=top_k,
        session_id=session_id,
        min_score=min_score,
        use_hybrid=use_hybrid,
        use_reranking=use_reranking,
        use_hyde=use_hyde,
        use_crag=use_crag,
        api_key=effective_api_key
    )

    if not retrieved_docs:
        return {
            "query": query,
            "answer": "No relevant documents found matching your query. Please upload documents or adjust search filters.",
            "sources": [],
            "model_used": "None",
            "pipeline_trace": trace
        }

    # Format context with source metadata tags
    context_blocks = []
    sources = []

    for doc in retrieved_docs:
        src_label = f"[Source: {doc['source']} (Page {doc['page']})]"
        context_blocks.append(f"{src_label}\n{doc['text']}")

        sources.append({
            "source": doc["source"],
            "page": doc["page"],
            "snippet": doc["text"][:160] + "...",
            "full_text": doc["text"],
            "score": doc.get("score", 0.0),
            "dense_rank": doc.get("dense_rank", 1),
            "sparse_rank": doc.get("sparse_rank", 1),
            "rrf_score": doc.get("rrf_score", 0.0),
            "crag_grade": doc.get("crag_grade", "RELEVANT"),
            "crag_score": doc.get("crag_score", 1.0),
            "matched_keywords": doc.get("matched_keywords", [])
        })

    context_str = "\n\n".join(context_blocks)
    gen_result = generate_answer(context_str, query, enable_self_rag=use_self_rag)

    answer_text = gen_result.get("answer", "")
    model_used = gen_result.get("model_used", "Unknown")
    self_rag = gen_result.get("self_rag", {})

    trace["self_rag"] = self_rag
    trace["model_used"] = model_used

    return {
        "query": query,
        "answer": answer_text,
        "sources": sources,
        "model_used": model_used,
        "self_rag": self_rag,
        "pipeline_trace": trace
    }