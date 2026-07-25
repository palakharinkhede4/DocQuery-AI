from src.retriever import retrieve
from src.generator import generate_answer


def run_pipeline(query, top_k=4):
    """
    Run full end-to-end RAG pipeline: Query -> Retriever -> Prompt Context -> LLM Answer + Sources.
    """
    retrieved_docs = retrieve(query, top_k=top_k)

    if not retrieved_docs:
        return {
            "query": query,
            "answer": "No documents found in the vector index. Please upload documents first.",
            "sources": []
        }

    # Format context with source metadata tags
    context_blocks = []
    sources = []

    for idx, doc in enumerate(retrieved_docs):
        src_label = f"[Source: {doc['source']} (Page {doc['page']})]"
        context_blocks.append(f"{src_label}\n{doc['text']}")

        sources.append({
            "source": doc["source"],
            "page": doc["page"],
            "snippet": doc["text"][:150] + "...",
            "full_text": doc["text"],
            "score": doc["score"]
        })

    context_str = "\n\n".join(context_blocks)
    answer = generate_answer(context_str, query)

    return {
        "query": query,
        "answer": answer,
        "sources": sources
    }