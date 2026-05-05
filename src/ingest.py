import os
import faiss
import pickle
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL
from utils import chunk_text


model = SentenceTransformer(EMBEDDING_MODEL)

docs_path = "data/docs"
chunks = []

for file in os.listdir(docs_path):
    file_path = os.path.join(docs_path, file)

    if file.endswith(".txt"):
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
            chunks.extend(chunk_text(text))

print(f"Total chunks: {len(chunks)}")

embeddings = model.encode(
    chunks,
    normalize_embeddings=True,
    show_progress_bar=True
)

dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)
index.add(embeddings)

os.makedirs("vectorstore/faiss_index", exist_ok=True)

faiss.write_index(index, "vectorstore/faiss_index/index.faiss")

with open("vectorstore/faiss_index/chunks.pkl", "wb") as f:
    pickle.dump(chunks, f)

print("✅ FAISS index created successfully")