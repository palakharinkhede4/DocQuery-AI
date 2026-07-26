import os
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP, DATA_DIR
from utils import chunk_documents
from src.parsers import parse_document
from src.vectorstore import get_vector_store

_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model


def ingest_file_objects(files, session_id=None, progress_callback=None):
    """
    Ingest user-uploaded file objects dynamically into a session-isolated vector store.
    :param files: list of dicts [{'name': 'doc.pdf', 'content': bytes}]
    :param session_id: unique session string ID
    :param progress_callback: optional callback function(progress_pct, message_str)
    """
    if progress_callback:
        progress_callback(0.05, "Initializing embedding model...")

    model = get_embedding_model()
    all_chunk_records = []
    processed_files = []
    total_files = len(files)

    for idx, file_info in enumerate(files):
        file_name = file_info.get("name", "document.txt")
        file_bytes = file_info.get("content")

        if progress_callback:
            pct = 0.1 + (0.5 * (idx / max(total_files, 1)))
            progress_callback(pct, f"Parsing document ({idx + 1}/{total_files}): {file_name}...")

        parsed_blocks = parse_document(file_name, file_bytes)
        chunk_records = chunk_documents(parsed_blocks, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
        all_chunk_records.extend(chunk_records)
        processed_files.append(file_name)

    if not all_chunk_records:
        if progress_callback:
            progress_callback(1.0, "No valid text extracted.")
        return {"status": "error", "message": "No valid text could be extracted from files."}

    if progress_callback:
        progress_callback(0.65, f"Generating embeddings for {len(all_chunk_records)} text chunks...")

    texts = [record["text"] for record in all_chunk_records]

    # Process embeddings in batches for progress tracking
    batch_size = 32
    total_chunks = len(texts)
    all_embeddings = []

    for start_idx in range(0, total_chunks, batch_size):
        end_idx = min(start_idx + batch_size, total_chunks)
        batch_texts = texts[start_idx:end_idx]
        batch_emb = model.encode(batch_texts, normalize_embeddings=True, show_progress_bar=False)
        all_embeddings.append(batch_emb)

        if progress_callback:
            pct = 0.65 + (0.28 * (end_idx / total_chunks))
            progress_callback(pct, f"Generating vector embeddings ({end_idx}/{total_chunks} chunks)...")

    import numpy as np
    if len(all_embeddings) == 1:
        embeddings = all_embeddings[0]
    else:
        embeddings = np.vstack(all_embeddings)

    if progress_callback:
        progress_callback(0.95, "Storing vector indices in FAISS...")

    vstore = get_vector_store(session_id=session_id)
    vstore.add_texts(all_chunk_records, embeddings)

    if progress_callback:
        progress_callback(1.0, f"✅ Processing complete ({len(all_chunk_records)} chunks indexed)!")

    return {
        "status": "success",
        "processed_files": processed_files,
        "total_chunks": len(all_chunk_records)
    }


def ingest_directory(dir_path=DATA_DIR, session_id=None, progress_callback=None):
    """Ingest all technical documents from directory into session-isolated store."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
        return {"status": "warning", "message": f"Directory {dir_path} was empty. Created folder."}

    files = []
    for file in os.listdir(dir_path):
        file_path = os.path.join(dir_path, file)
        if os.path.isfile(file_path):
            with open(file_path, "rb") as f:
                files.append({"name": file, "content": f.read()})

    if not files:
        return {"status": "warning", "message": f"No files found in {dir_path}."}

    return ingest_file_objects(files, session_id=session_id, progress_callback=progress_callback)


if __name__ == "__main__":
    print("[Ingest] Starting Technical Document Ingestion Pipeline...")
    res = ingest_directory()
    print("[Ingest] Result:", res)