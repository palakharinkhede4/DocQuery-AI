import os
import pickle
import shutil
import numpy as np
from config import VECTORSTORE_DIR


class BaseVectorStore:
    def add_texts(self, chunks_with_metadata, embeddings):
        raise NotImplementedError

    def search(self, query_embedding, top_k=4):
        raise NotImplementedError

    def get_documents(self):
        raise NotImplementedError

    def clear(self):
        raise NotImplementedError


class FAISSVectorStore(BaseVectorStore):
    def __init__(self, index_dir=VECTORSTORE_DIR):
        import faiss
        self.faiss = faiss
        self.index_dir = index_dir
        self.index_file = os.path.join(index_dir, "index.faiss")
        self.pkl_file = os.path.join(index_dir, "chunks.pkl")
        self.index = None
        self.documents = []
        self._load()

    def _load(self):
        if os.path.exists(self.index_file) and os.path.exists(self.pkl_file):
            try:
                self.index = self.faiss.read_index(self.index_file)
                with open(self.pkl_file, "rb") as f:
                    self.documents = pickle.load(f)
            except Exception as e:
                print(f"Warning loading FAISS index: {e}")
                self.index = None
                self.documents = []

    def save(self):
        os.makedirs(self.index_dir, exist_ok=True)
        if self.index is not None:
            self.faiss.write_index(self.index, self.index_file)
            with open(self.pkl_file, "wb") as f:
                pickle.dump(self.documents, f)

    def add_texts(self, chunks_with_metadata, embeddings):
        embeddings = np.array(embeddings, dtype=np.float32)
        dim = embeddings.shape[1]

        if self.index is None:
            self.index = self.faiss.IndexFlatIP(dim)

        # Normalize for inner product (cosine similarity)
        self.faiss.normalize_L2(embeddings)
        self.index.add(embeddings)

        self.documents.extend(chunks_with_metadata)
        self.save()

    def search(self, query_embedding, top_k=4):
        if self.index is None or self.index.ntotal == 0:
            return []

        query_vector = np.array(query_embedding, dtype=np.float32)
        if query_vector.ndim == 1:
            query_vector = np.expand_dims(query_vector, axis=0)

        self.faiss.normalize_L2(query_vector)
        distances, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if 0 <= idx < len(self.documents):
                doc = self.documents[idx]
                results.append({
                    "text": doc.get("text") if isinstance(doc, dict) else str(doc),
                    "metadata": doc.get("metadata", {}) if isinstance(doc, dict) else {},
                    "score": float(dist)
                })

        return results

    def get_documents(self):
        seen_files = set()
        file_stats = []
        for doc in self.documents:
            meta = doc.get("metadata", {}) if isinstance(doc, dict) else {}
            src = meta.get("source", "unknown")
            if src not in seen_files:
                seen_files.add(src)
                file_stats.append(src)
        return {
            "files": file_stats,
            "total_chunks": len(self.documents)
        }

    def clear(self):
        self.index = None
        self.documents = []
        if os.path.exists(self.index_dir):
            shutil.rmtree(self.index_dir, ignore_errors=True)


# Session-isolated store cache
_session_stores = {}


def get_vector_store(session_id=None):
    """Return session-isolated FAISS Vector Store instance."""
    if not session_id:
        session_id = "default_session"

    if session_id not in _session_stores:
        session_dir = os.path.join(VECTORSTORE_DIR, session_id)
        _session_stores[session_id] = FAISSVectorStore(index_dir=session_dir)

    return _session_stores[session_id]


def clear_session_store(session_id):
    """Clear and remove vector store for a specific session."""
    if not session_id:
        session_id = "default_session"

    vstore = get_vector_store(session_id)
    vstore.clear()

    if session_id in _session_stores:
        del _session_stores[session_id]
