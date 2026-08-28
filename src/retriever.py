from typing import List, Dict, Any, Optional, Tuple
from config import (
    TOP_K,
    EMBEDDING_MODEL,
    USE_HYBRID_SEARCH,
    USE_RERANKING,
    USE_HYDE,
    USE_CRAG,
    RRF_K
)
from src.ingest import get_embedding_model
from src.vectorstore import get_vector_store
from src.advanced_rag import (
    generate_hyde_passage,
    rerank_passages,
    CRAGGrader
)


def retrieve(
    query: str,
    top_k: int = TOP_K,
    session_id: Optional[str] = None,
    min_score: float = 0.40,
    use_hybrid: bool = USE_HYBRID_SEARCH,
    use_reranking: bool = USE_RERANKING,
    use_hyde: bool = USE_HYDE,
    use_crag: bool = USE_CRAG,
    api_key: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Multi-Stage Advanced Retrieval Engine:
    1. Query Processing & (optional) HyDE Expansion
    2. Hybrid Retrieval: Sparse BM25 + Dense FAISS via Reciprocal Rank Fusion (RRF)
    3. Cross-Encoder Multi-Pass Reranking
    4. Corrective RAG (CRAG) Document Relevance Grading & Filtering
    5. Detailed Pipeline Execution Trace
    """
    query_clean = query.strip()
    if not query_clean:
        return [], {"error": "Empty query", "steps": []}

    trace: Dict[str, Any] = {
        "original_query": query_clean,
        "hyde_expanded": False,
        "hyde_query": None,
        "hybrid_enabled": use_hybrid,
        "reranking_enabled": use_reranking,
        "crag_enabled": use_crag,
        "steps": []
    }

    # 1. HyDE Query Expansion
    search_query = query_clean
    if use_hyde:
        try:
            hyde_passage = generate_hyde_passage(query_clean, api_key=api_key)
            if hyde_passage and hyde_passage != query_clean:
                search_query = hyde_passage
                trace["hyde_expanded"] = True
                trace["hyde_query"] = hyde_passage
                trace["steps"].append("HyDE: Generated hypothetical answer passage for semantic matching.")
        except Exception as e:
            trace["steps"].append(f"HyDE expansion skipped: {e}")

    # 2. Embedding Generation
    model = get_embedding_model()
    if "bge" in EMBEDDING_MODEL.lower():
        formatted_query = f"Represent this sentence for searching relevant passages: {search_query}"
    else:
        formatted_query = search_query

    query_embedding = model.encode([formatted_query], normalize_embeddings=True)

    vstore = get_vector_store(session_id=session_id)

    # 3. Hybrid / Dense Search
    initial_k = max(top_k * 3, 10)
    if use_hybrid:
        raw_candidates = vstore.hybrid_search(
            query=query_clean,
            query_embedding=query_embedding,
            top_k=initial_k,
            rrf_k=RRF_K
        )
        trace["steps"].append(f"Hybrid Search: Fused BM25 sparse & FAISS dense candidates via RRF (k={RRF_K}).")
    else:
        raw_candidates = vstore.search(query_embedding, top_k=initial_k)
        trace["steps"].append("Dense Search: Retrieved candidates via FAISS cosine similarity.")

    if not raw_candidates:
        return [], trace

    # 4. Cross-Encoder Reranking
    if use_reranking:
        reranked_candidates = rerank_passages(query_clean, raw_candidates, top_k=initial_k)
        trace["steps"].append("Cross-Encoder: Joint query-document attention rescoring applied.")
    else:
        reranked_candidates = raw_candidates

    # 5. Corrective RAG (CRAG) Relevance Grading
    if use_crag:
        graded_candidates, crag_stats = CRAGGrader.grade_documents(
            query=query_clean,
            documents=reranked_candidates,
            min_relevance=min_score
        )
        trace["crag_stats"] = crag_stats
        trace["steps"].append(
            f"CRAG Grading: {crag_stats.get('relevant_count', 0)} relevant, "
            f"{crag_stats.get('filtered_count', 0)} noise chunks filtered."
        )
        final_candidates = graded_candidates[:top_k]
    else:
        # Simple score filtering fallback
        filtered = [r for r in reranked_candidates if r.get("rerank_score", r.get("score", 0.0)) >= min_score]
        final_candidates = filtered[:top_k] if filtered else reranked_candidates[:top_k]

    formatted_results = []
    for r in final_candidates:
        meta = r.get("metadata", {})
        formatted_results.append({
            "text": r.get("text", ""),
            "source": meta.get("source", "Unknown Document"),
            "page": meta.get("page", 1),
            "score": round(r.get("rerank_score", r.get("score", 0.0)), 4),
            "dense_rank": r.get("dense_rank", 1),
            "sparse_rank": r.get("sparse_rank", 1),
            "rrf_score": r.get("rrf_score", round(r.get("score", 0.0), 4)),
            "crag_grade": r.get("crag_grade", "RELEVANT"),
            "crag_score": r.get("crag_score", 1.0),
            "matched_keywords": r.get("matched_keywords", [])
        })

    trace["final_count"] = len(formatted_results)
    return formatted_results, trace