import re

def chunk_text(text, chunk_size=1200, overlap=200):
    """
    Chunk raw text preserving bullet lists and multi-paragraph sections intact.
    Converts list blocks into unified chunks to prevent splitting related items.
    """
    if not text or not text.strip():
        return []

    # Standardize line breaks
    text = text.replace("\r\n", "\n")

    # Group lines: do not split bullet points (lines starting with •, -, *, or digits)
    lines = text.split("\n")
    blocks = []
    current_block = []

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue

        is_bullet = bool(re.match(r'^[•\-\*\d+\.]', line_str))
        
        if is_bullet and current_block and not re.match(r'^[•\-\*\d+\.]', current_block[0].strip()):
            # Push non-bullet paragraph block
            blocks.append("\n".join(current_block))
            current_block = [line_str]
        else:
            current_block.append(line_str)

    if current_block:
        blocks.append("\n".join(current_block))

    # Build character-bounded chunks up to chunk_size
    chunks = []
    current_chunk = []
    current_len = 0

    for block in blocks:
        if current_len + len(block) <= chunk_size:
            current_chunk.append(block)
            current_len += len(block) + 2
        else:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
            # Retain overlap
            overlap_blocks = []
            overlap_len = 0
            for prev in reversed(current_chunk):
                if overlap_len + len(prev) <= overlap:
                    overlap_blocks.insert(0, prev)
                    overlap_len += len(prev) + 2
                else:
                    break
            current_chunk = overlap_blocks + [block]
            current_len = sum(len(b) + 2 for b in current_chunk)

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks if chunks else [text]


def chunk_documents(doc_blocks, chunk_size=1200, overlap=200):
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