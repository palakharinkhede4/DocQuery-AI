from config import TOP_K
from src.ingest import get_embedding_model
from src.vectorstore import get_vector_store


def retrieve(query, top_k=TOP_K):
    """
    Retrieve top-k relevant document chunks along with source metadata.
    """
    query_clean = query.strip()
    if not query_clean:
        return []

    model = get_embedding_model()
    query_embedding = model.encode([query_clean], normalize_embeddings=True)

    vstore = get_vector_store()
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