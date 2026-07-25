import io
import os
import pypdf
import docx


def parse_pdf(file_bytes_or_path, file_name="document.pdf"):
    """Extract text from PDF pages with layout-preserving text extraction."""
    documents = []

    if isinstance(file_bytes_or_path, bytes):
        reader = pypdf.PdfReader(io.BytesIO(file_bytes_or_path))
    else:
        reader = pypdf.PdfReader(file_bytes_or_path)

    for i, page in enumerate(reader.pages):
        try:
            # Layout mode preserves bullet points and multi-column alignment
            text = page.extract_text(extraction_mode="layout") or ""
        except Exception:
            text = page.extract_text() or ""

        text = text.strip()
        if text:
            documents.append({
                "text": text,
                "metadata": {
                    "source": file_name,
                    "page": i + 1
                }
            })

    return documents


def parse_docx(file_bytes_or_path, file_name="document.docx"):
    """Extract text from Word DOCX document."""
    documents = []

    if isinstance(file_bytes_or_path, bytes):
        doc = docx.Document(io.BytesIO(file_bytes_or_path))
    else:
        doc = docx.Document(file_bytes_or_path)

    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())

    text = "\n".join(full_text)
    if text:
        documents.append({
            "text": text,
            "metadata": {
                "source": file_name,
                "page": 1
            }
        })

    return documents


def parse_txt(file_bytes_or_path, file_name="document.txt"):
    """Extract text from plain text or Markdown document."""
    documents = []

    if isinstance(file_bytes_or_path, bytes):
        text = file_bytes_or_path.decode("utf-8", errors="ignore")
    else:
        with open(file_bytes_or_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    text = text.strip()
    if text:
        documents.append({
            "text": text,
            "metadata": {
                "source": file_name,
                "page": 1
            }
        })

    return documents


def parse_document(file_name, file_bytes_or_path):
    """Unified document parser for PDF, DOCX, TXT, and MD files."""
    ext = os.path.splitext(file_name)[1].lower()

    if ext == ".pdf":
        return parse_pdf(file_bytes_or_path, file_name=file_name)
    elif ext in [".docx", ".doc"]:
        return parse_docx(file_bytes_or_path, file_name=file_name)
    elif ext in [".txt", ".md", ".csv", ".json", ".log"]:
        return parse_txt(file_bytes_or_path, file_name=file_name)
    else:
        return parse_txt(file_bytes_or_path, file_name=file_name)
