import re

def chunk_text(text, chunk_size=1200, overlap=200):
    """
    Chunk raw text preserving sentence and bullet-point integrity.
    Prevents mid-sentence slicing and ensures technical lists stay whole.
    """
    if not text or not text.strip():
        return []

    # Standardize line breaks
    text = text.replace("\r\n", "\n")

    # Split text into paragraphs or bullet-point blocks
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]

    chunks = []
    current_chunk = []
    current_length = 0

    for para in paragraphs:
        # If paragraph itself is very long, split by line/sentence
        if len(para) > chunk_size:
            lines = [l.strip() for l in para.split("\n") if l.strip()]
            for line in lines:
                if current_length + len(line) <= chunk_size:
                    current_chunk.append(line)
                    current_length += len(line) + 1
                else:
                    if current_chunk:
                        chunks.append("\n".join(current_chunk))
                    # Retain last few lines for overlap
                    overlap_lines = []
                    overlap_len = 0
                    for prev in reversed(current_chunk):
                        if overlap_len + len(prev) <= overlap:
                            overlap_lines.insert(0, prev)
                            overlap_len += len(prev) + 1
                        else:
                            break
                    current_chunk = overlap_lines + [line]
                    current_length = sum(len(l) + 1 for l in current_chunk)
        else:
            if current_length + len(para) <= chunk_size:
                current_chunk.append(para)
                current_length += len(para) + 2
            else:
                if current_chunk:
                    chunks.append("\n\n".join(current_chunk))
                # Retain overlap
                overlap_paras = []
                overlap_len = 0
                for prev in reversed(current_chunk):
                    if overlap_len + len(prev) <= overlap:
                        overlap_paras.insert(0, prev)
                        overlap_len += len(prev) + 2
                    else:
                        break
                current_chunk = overlap_paras + [para]
                current_length = sum(len(p) + 2 for p in current_chunk)

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