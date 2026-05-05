import faiss
import pickle
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL, TOP_K

model = SentenceTransformer(EMBEDDING_MODEL)

index = faiss.read_index("vectorstore/faiss_index/index.faiss")

with open("vectorstore/faiss_index/chunks.pkl", "rb") as f:
    chunks = pickle.load(f)


def retrieve(query):
    query = query.lower().strip()

    # 🔥 Query expansion (VERY IMPORTANT)
    expanded_query = f"{query}. Explain {query} in machine learning."

    query_embedding = model.encode(
    [expanded_query],
    normalize_embeddings=True
)
    distances, indices = index.search(query_embedding, TOP_K)

    results = [chunks[i] for i in indices[0]]

    return results