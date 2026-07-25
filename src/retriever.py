from config import TOP_K, EMBEDDING_MODEL
from src.ingest import get_embedding_model
from src.vectorstore import get_vector_store


def retrieve(query, top_k=TOP_K, session_id=None):
    """
    Retrieve top-k relevant document chunks from session-isolated vector store using BGE query formatting.
    """
    query_clean = query.strip()
    if not query_clean:
        return []

    model = get_embedding_model()

    # BGE models require query instruction prefix for accurate semantic search
    if "bge" in EMBEDDING_MODEL.lower():
        formatted_query = f"Represent this sentence for searching relevant passages: {query_clean}"
    else:
        formatted_query = query_clean

    query_embedding = model.encode([formatted_query], normalize_embeddings=True)

    vstore = get_vector_store(session_id=session_id)
    results = vstore.search(query_embedding, top_k=top_k)

    formatted_results = []
    for r in results:
        meta = r.get("metadata", {})
        formatted_results.append({
            "text": r.get("text", ""),
            "source": meta.get("source", "Unknown Document"),
            "page": meta.get("page", 1),
            "score": round(r.get("score", 0.0), 4)
        })

    return formatted_results