def chunk_text(text, chunk_size=400, overlap=50):
    """Chunk raw text into character/word bounded segments with sentence boundary sensitivity."""
    sentences = text.replace("\r\n", "\n").split(". ")
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        sentence_str = sentence.strip()
        if not sentence_str:
            continue
        if len(current_chunk) + len(sentence_str) < chunk_size:
            current_chunk += sentence_str + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            # Overlap handling
            if len(current_chunk) > overlap:
                current_chunk = current_chunk[-overlap:] + sentence_str + ". "
            else:
                current_chunk = sentence_str + ". "

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text[:chunk_size]]


def chunk_documents(doc_blocks, chunk_size=400, overlap=50):
    """Chunk doc_blocks preserving source and page metadata."""
    chunked_records = []

    for block in doc_blocks:
        text = block.get("text", "")
        meta = block.get("metadata", {})
        sub_chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)

        for idx, chunk in enumerate(sub_chunks):
            record_meta = meta.copy()
            record_meta["chunk_index"] = idx
            chunked_records.append({
                "text": chunk,
                "metadata": record_meta
            })

    return chunked_records