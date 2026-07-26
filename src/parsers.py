import io
import os
import re
import pypdf
import docx


def clean_pdf_text(text):
    """
    Clean up PDF font ligature and kerning glitches.
    Preserves single-letter words like 'a', 'A', 'I' cleanly.
    """
    if not text:
        return ""

    # Fix specific recurring PDF OCR / kerning glitches
    glitches = {
        "r ainw ater": "rainwater",
        "rainw ater": "rainwater",
        "collec tion": "collection",
        "s ystem": "system",
        "t ypically": "typically",
        "suppor ts": "supports",
        "sanitar y": "sanitary",
        "inspec tion": "inspection",
        "r un-of f": "run-off",
        "coef ficient": "coefficient",
        "over flow": "overflow",
        "ver min": "vermin",
        "ventil ation": "ventilation",
        "ac tivit y": "activity",
        "oper ation": "operation",
        "distr ic t": "district",
        "prov ince": "province",
        "v ill age": "village",
        "par ish": "parish",
        "descr ibe": "describe",
        "af fec ted": "affected",
        "r ainfall": "rainfall",
        "gut ter": "gutter",
        "gut ter ing": "guttering"
    }

    for glitch, fix in glitches.items():
        text = re.sub(re.escape(glitch), fix, text, flags=re.IGNORECASE)

    # Clean up footnote superscript markers like 'source.a' -> 'source.'
    text = re.sub(r'([a-z0-9])\.([a-d1-9])\b', r'\1.', text)

    # Clean excessive whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)

    return text.strip()


def parse_pdf(file_bytes_or_path, file_name="document.pdf"):
    """Extract text from PDF pages with clean text repair."""
    documents = []

    if isinstance(file_bytes_or_path, bytes):
        reader = pypdf.PdfReader(io.BytesIO(file_bytes_or_path))
    else:
        reader = pypdf.PdfReader(file_bytes_or_path)

    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""

        text = clean_pdf_text(text)

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
