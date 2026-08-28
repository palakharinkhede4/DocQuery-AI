import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#78716c"))

        # Header
        self.drawString(54, 11 * 72 - 36, "DocQuery AI — Advanced RAG Architecture & Interview Masterclass")
        self.setStrokeColor(colors.HexColor("#e7e5e4"))
        self.setLineWidth(0.5)
        self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)

        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — PREPARATION GUIDE")
        self.line(54, 46, 8.5 * 72 - 54, 46)
        self.restoreState()


def build_rag_handbook(output_filename="Advanced_RAG_Architecture_and_Interview_Masterclass.pdf"):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0f172a")     # Deep slate
    ACCENT = colors.HexColor("#0284c7")      # Bright cyan/blue
    AMBER = colors.HexColor("#d97706")       # Amber
    GREEN = colors.HexColor("#059669")       # Emerald
    BG_LIGHT = colors.HexColor("#f8fafc")    # Light slate
    BORDER_COLOR = colors.HexColor("#cbd5e1")# Slate border
    TEXT_DARK = colors.HexColor("#1e293b")   # Body text
    TEXT_MUTED = colors.HexColor("#64748b")  # Muted text

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=PRIMARY,
        alignment=0,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=ACCENT,
        alignment=0,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'H3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        leftIndent=8,
        rightIndent=8,
        spaceBefore=4,
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=4,
        spaceAfter=4
    )

    q_title_style = ParagraphStyle(
        'QTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14.5,
        textColor=colors.HexColor("#0369a1"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    ans_style = ParagraphStyle(
        'Ans',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        spaceAfter=8
    )

    story = []

    def add_callout(text, bg="#f8fafc", border="#0284c7"):
        p = Paragraph(text, callout_style)
        t = Table([[p]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg)),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border)),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 6))

    # =========================================================================
    # COVER / HEADER
    # =========================================================================
    story.append(Paragraph("DocQuery AI: Advanced Multi-Stage RAG Architecture", title_style))
    story.append(Paragraph("Comprehensive System Design, Theoretical Foundations, Production Edge-Cases, and Senior AI Interview Masterclass", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=14))

    # Summary Metadata Box
    meta_data = [
        [Paragraph("<b>Target Domain:</b> Technical Document Q&A & Knowledge Extraction", body_style),
         Paragraph("<b>Core Models:</b> Gemini 2.0 Flash / BGE / ms-marco-MiniLM-L-6-v2", body_style)],
        [Paragraph("<b>Retrieval Paradigm:</b> Hybrid (BM25 + FAISS Dense) with RRF (k=60)", body_style),
         Paragraph("<b>Verification Engine:</b> CRAG Relevance Grading & Self-RAG Grounding", body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[252, 252])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 1: ARCHITECTURAL TOPOLOGY & PIPELINE OVERVIEW
    # =========================================================================
    story.append(Paragraph("1. System Architecture & Execution Pipeline", h1_style))
    story.append(Paragraph(
        "DocQuery AI replaces traditional single-step vector retrieval with a research-backed <b>Multi-Stage Advanced RAG Pipeline</b>. Standard naive RAG architectures suffer from keyword blindness, rank scale mismatches, document-structure noise, and hallucination loops. Our architecture resolves these through sequential multi-tier refinement.",
        body_style
    ))

    # ASCII Flowchart in Box
    arch_flow = """
  [User Query] ──> [1. HyDE Query Expansion] (Generates hypothetical answer)
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
  [2a. Sparse Lexical]                    [2b. Dense Vector]
  (BM25 Okapi + Stemming + N-gram)        (FAISS / Gemini Cosine Sim)
       │                                       │
       └───────────────────┬───────────────────┘
                           ▼
  [3. Reciprocal Rank Fusion (RRF, k=60)] (Normalizes & merges ranks)
                           │
                           ▼
  [4. Cross-Encoder Multi-Pass Reranking] (ms-marco-MiniLM joint attention)
                           │
                           ▼
  [5. Corrective RAG (CRAG) Grader] (Filters TOC, Syllabus & noise)
                           │
                           ▼
  [6. SOTA Chain-of-Evidence Synthesizer] (Structured reasoning + citations)
                           │
                           ▼
  [7. Self-RAG Grounding Verifier] (Faithfulness check & confidence badge)
                           │
                           ▼
  [Verified Output + In-Line Citations + Execution Trace]
"""
    story.append(Paragraph(arch_flow.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 8))

    # Table of Pipeline Stages
    stages_data = [
        ["Stage", "Technique", "Algorithm / Model", "Role in Architecture", "Why We Chose It"],
        ["1", "HyDE", "Gemini 2.0 / Domain Expansion", "Query Transformation", "Bridges semantic gap between short user questions and dense textbook answer-space."],
        ["2a", "Sparse Search", "BM25 Okapi + N-grams", "Lexical Inverted Index", "Captures exact function signatures, variable names, keywords, and acronyms."],
        ["2b", "Dense Search", "FAISS / Gemini Embeddings", "Vector Similarity Search", "Captures conceptual semantics, paraphrasing, and high-level intent."],
        ["3", "Score Fusion", "Reciprocal Rank Fusion (k=60)", "Rank Aggregation", "Scale-invariant mathematical fusion of sparse and dense scores without manual calibration."],
        ["4", "Reranking", "ms-marco-MiniLM-L-6-v2", "Cross-Encoder Rescoring", "Joint token cross-attention over Query-Passage pairs; fixes bi-encoder loss."],
        ["5", "CRAG Grading", "Relevance Classifier", "Noise Filtering", "Actively eliminates Syllabus/TOC pages and unrelated textbook section headers."],
        ["6", "Generation", "Chain-of-Evidence Prompt", "Structured LLM Synthesis", "Forces Executive Summary, Mechanism Deep Dive, Code, and strict topic isolation."],
        ["7", "Self-RAG", "Faithfulness Verifier", "Post-Gen Validation", "Measures source term support overlap; outputs grounding confidence metric."]
    ]
    stages_table = Table(stages_data, colWidths=[30, 75, 110, 110, 179])
    stages_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 7.5),
        ('LEADING', (0,0), (-1,-1), 10),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(stages_table)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 2: IN-DEPTH THEORY OF ADVANCED TECHNIQUES
    # =========================================================================
    story.append(Paragraph("2. Deep Dive: Theoretical Foundations & Implementation", h1_style))

    # 2.1 Hybrid Retrieval & BM25 Okapi
    story.append(Paragraph("2.1 Hybrid Retrieval (BM25 Okapi + Dense Vectors)", h2_style))
    story.append(Paragraph(
        "<b>Dense Vector Search</b> excels at fuzzy semantic matching (e.g. mapping <i>'prevent memory leaks'</i> to <i>'destructor deallocation'</i>). However, dense embeddings frequently fail on exact technical identifiers (e.g. <code>malloc</code>, <code>vptr</code>, <code>inline</code>, <code>const int*</code>) because embeddings project distinct variable names into similar latent clusters.",
        body_style
    ))
    story.append(Paragraph(
        "<b>BM25 Okapi</b> calculates term relevance by balancing Term Frequency (TF) with Document Length Normalization: "
        "<br/><code>Score(D, Q) = &Sigma; IDF(q_i) &times; [ TF(q_i, D) &times; (k1 + 1) ] / [ TF(q_i, D) + k1 &times; (1 - b + b &times; (|D| / avgDL)) ]</code><br/>"
        "where <code>k1=1.5</code> controls term frequency saturation and <code>b=0.75</code> controls document length penalization.",
        body_style
    ))

    # 2.2 Reciprocal Rank Fusion (RRF)
    story.append(Paragraph("2.2 Reciprocal Rank Fusion (RRF, k=60)", h2_style))
    story.append(Paragraph(
        "Combining dense vector cosine similarity (range: -1.0 to 1.0) and sparse BM25 scores (range: 0 to 50+) via linear weighted averaging is notoriously brittle because raw score distributions vary per query. <b>RRF solves this by operating solely on ordinal ranks</b>:<br/>"
        "<code>RRF_Score(d) = &Sigma;_{m &isin; {dense, sparse}} 1 / (k + r_m(d))</code><br/>"
        "We set <code>k = 60</code> (the standard research constant). Items appearing in the top ranks of both dense and sparse modalities get an exponential rank boost, while single-modality outliers are smoothed safely.",
        body_style
    ))

    # 2.3 Cross-Encoder Reranking
    story.append(Paragraph("2.3 Cross-Encoder Reranking vs Bi-Encoders", h2_style))
    story.append(Paragraph(
        "<b>Bi-Encoders</b> encode the query and passage independently: <code>sim = cos(E(Q), E(P))</code>. This enables fast indexing but ignores word-by-word cross-attention. <br/>"
        "<b>Cross-Encoders</b> (e.g. <code>ms-marco-MiniLM-L-6-v2</code>) concatenate Query and Passage into a single transformer input: <code>Score = Transformer([CLS] Query [SEP] Passage [SEP])</code>. All query tokens attend to all passage tokens across all transformer layers. We use Cross-Encoders as a <b>Pass 2 rescorer</b> on the top-40 RRF candidates.",
        body_style
    ))

    # 2.4 HyDE
    story.append(Paragraph("2.4 Hypothetical Document Embeddings (HyDE)", h2_style))
    story.append(Paragraph(
        "When users submit short, abstract queries (e.g. <i>'what are private member functions?'</i>), the vector is located in the <i>query manifold</i>. Engineering documents are written in the <i>answer/declarative manifold</i>. HyDE instructs an LLM to generate a hypothetical textbook paragraph, then embeds that hypothetical document. Retrieval matches in answer-to-answer semantic space.",
        body_style
    ))

    # 2.5 CRAG & Self-RAG
    story.append(Paragraph("2.5 Corrective RAG (CRAG) & Self-RAG Grounding", h2_style))
    story.append(Paragraph(
        "<b>CRAG</b> grades candidate passages into <code>RELEVANT</code>, <code>PARTIALLY_RELEVANT</code>, or <code>IRRELEVANT</code>, actively dropping noise before the prompt is constructed.<br/>"
        "<b>Self-RAG</b> performs post-generation validation, measuring the proportion of generated factual terms that have direct token support in the cited context passages, emitting a confidence score (e.g. <code>Fully Grounded (94%)</code>).",
        body_style
    ))
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 3: REAL-WORLD BUGS SOLVED & ENGINEERING LESSONS
    # =========================================================================
    story.append(Paragraph("3. Production Case Study: Resolving the 'Syllabus/TOC Hub' Failure", h1_style))
    story.append(Paragraph(
        "During live testing on a 146-page C++ textbook (<code>285_OOPS lecture notes Complete.pdf</code>), querying <i>'what are Private member functions?'</i> failed, returning only the Syllabus and Table of Contents, causing the LLM to output <i>'Insufficient information'</i>. Here is why it happened and how we engineered the permanent fix:",
        body_style
    ))

    add_callout(
        "<b>Key Lesson:</b> A RAG system is only as good as its candidate recall. Even if an LLM is powerful and a Cross-Encoder is state-of-the-art, structural noise like Syllabi and Table of Contents will monopolize the candidate pool unless explicitly de-biased.",
        bg="#fffbeb", border="#d97706"
    )

    debug_steps = [
        Paragraph("<b>1. The Keyword Density Hub:</b> The Syllabus (Page 3) and TOC (Page 4) list every keyword in the curriculum in a compact space, inflating raw BM25 term frequency scores above the actual lesson on Page 42.", bullet_style),
        Paragraph("<b>2. Narrow Candidate Pool:</b> The candidate pool was originally capped at 12 chunks. The Syllabus and TOC took top ranks, discarding Page 42 (candidate #14) before Cross-Encoder reranking.", bullet_style),
        Paragraph("<b>3. Morphological Stemming:</b> The query used plural <code>functions</code> while the definition sentence used singular <code>function</code>.", bullet_style),
        Paragraph("<b>4. Solution Implemented:</b> (a) Added automatic Syllabus/TOC detection (<code>isIndexOrSyllabusChunk</code>) with structural score de-biasing; (b) Added N-Gram (+4.0) and Section Heading (+15.0) matching; (c) Expanded candidate pool to 45+ chunks; (d) Added morphological stemmer.", bullet_style),
    ]
    for s in debug_steps:
        story.append(s)

    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 4: SENIOR RAG & AI INTERVIEW MASTERCLASS (25 QUESTIONS & ANSWERS)
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("4. Senior AI / LLM Engineer Interview Masterclass", h1_style))
    story.append(Paragraph(
        "This section contains 25 rigorous, high-frequency interview questions covering RAG architectures, mathematical formulations, latency optimizations, and production failure modes.",
        body_style
    ))

    qa_list = [
        ("Q1: What are the fundamental differences between Naive RAG and Advanced RAG?",
         "Naive RAG follows a fixed split-embed-retrieve-generate pipeline using single-vector cosine similarity. It suffers from poor precision, query-document semantic domain mismatch, chunk fragmentation, and no post-retrieval validation.\nAdvanced RAG introduces multi-stage pre-retrieval (HyDE, query rewriting), hybrid sparse-dense retrieval with RRF, multi-pass cross-encoder reranking, corrective relevance grading (CRAG), and self-reflective verification (Self-RAG) before emitting the answer."),

        ("Q2: Explain the mathematics of BM25 and why it is superior to TF-IDF for RAG.",
         "TF-IDF increases linearly with term frequency, meaning long documents with repeated keywords dominate. BM25 Okapi introduces term frequency saturation via parameter k1 (typically 1.2-2.0) so that beyond a certain point, additional term occurrences offer diminishing returns. Furthermore, parameter b (typically 0.75) normalizes for document length relative to average document length (avgDL), preventing long multi-topic documents from drowning out concise, relevant passages."),

        ("Q3: Why can't we use Cross-Encoders for the entire vector database search?",
         "Cross-Encoders evaluate full cross-attention between every query token and passage token (O(N*M) complexity). Performing Cross-Encoder inference over 100,000 chunks would require minutes per query. Bi-Encoders compute document embeddings offline (O(1) lookup via ANN indexes like HNSW). Therefore, production systems use Bi-Encoders/BM25 for high-recall candidate retrieval (top 50) and Cross-Encoders as a stage-2 reranker on the top candidates."),

        ("Q4: What is Reciprocal Rank Fusion (RRF) and why is it preferred over weighted score averaging?",
         "Dense vector scores (cosine similarity) and BM25 scores have completely different distributions and ranges. Normalizing them linearly (min-max) is unstable and heavily affected by query difficulty and outliers. RRF uses the formula RRF(d) = sum(1 / (k + rank(d))). Because it operates purely on ordinal ranks, it is scale-invariant, robust across diverse queries, and requires zero manual hyperparameter retraining."),

        ("Q5: What is Hypothetical Document Embeddings (HyDE) and what is its primary failure mode?",
         "HyDE prompts an LLM to generate a hypothetical answer to the user query, then embeds that hypothetical document instead of the raw query. This transforms the retrieval vector into the answer-manifold. Its main failure mode is when the LLM generates strong, confident hallucinations with incorrect terminology for obscure topics, guiding retrieval toward completely wrong document clusters. Mitigate this by appending the original query tokens and setting low temperature."),

        ("Q6: Explain Corrective RAG (CRAG) and how it handles low-confidence retrievals.",
         "CRAG evaluates retrieved documents using a lightweight evaluator/grader before generation. It categorizes candidate sets into: (1) Correct/Relevant: proceed to synthesis; (2) Ambiguous/Partially Relevant: perform passage refinement and strip noise; (3) Incorrect/Irrelevant: trigger fallback web search or query reformulation. This prevents noisy context from polluting the LLM's context window."),

        ("Q7: What is Self-RAG and how does it prevent hallucinations?",
         "Self-RAG trains or prompts the system with reflection tokens (Retrieve, ISREL, ISSUP, ISUSE). After generating an answer, it verifies: (1) Grounding/Faithfulness: Is every statement supported by the retrieved context? (2) Completeness: Does the answer address the user query? If grounding fails, the system triggers re-retrieval or masks unsupported claims."),

        ("Q8: How do you solve the 'Lost in the Middle' phenomenon in LLMs?",
         "LLMs attend most strongly to tokens at the very beginning and very end of the prompt context window, often ignoring crucial facts placed in the middle. Solutions include: (1) Cross-Encoder reranking to place the #1 highest-scoring chunk at the very top of the context; (2) Small chunk sizes (300-800 tokens); (3) Dynamic context trimming to minimize irrelevant background noise."),

        ("Q9: What is the difference between Chunking Strategies: Fixed, Recursive, and Semantic?",
         "Fixed chunking splits by character/token count with arbitrary overlap, often severing sentences. Recursive chunking splits hierarchically (by double newlines, single newlines, spaces, punctuation) to keep paragraphs intact. Semantic chunking computes embedding distance between consecutive sentences and places split boundaries only where semantic similarity drops sharply."),

        ("Q10: What is Contextual Retrieval (as popularized by Anthropic)?",
         "When a document is chunked, individual chunks often lose global context (e.g. a chunk saying 'its revenue grew by 14%' without mentioning the company name). Contextual Retrieval uses a fast LLM during ingestion to prepend a 50-100 token situational summary to every chunk before embedding, drastically improving BM25 and vector recall."),

        ("Q11: How do you evaluate a RAG system offline without ground-truth human labels?",
         "Use the RAG Triad framework (Ragas / TruLens): (1) Context Relevance: Are retrieved chunks pertinent to the query? (2) Groundedness / Faithfulness: Can all generated claims be inferred from the context? (3) Answer Relevance: Does the generated answer address the original question? These are evaluated using LLM-as-a-judge with strict calibration."),

        ("Q12: How do you design multi-tenant session isolation in a serverless RAG platform?",
         "Each user/organization has a partitioned vector namespace or in-memory session index keyed by SessionId. In memory/cache stores, sessions expire via TTL timers. When a session is cleared, the corresponding FAISS/HNSW index and inverted BM25 structures are purged, preventing cross-tenant data leakage."),

        ("Q13: What is GraphRAG and when is it superior to Vector RAG?",
         "Vector RAG searches by local semantic proximity, which fails on global aggregate questions like 'What are the main themes across all 500 documents?'. GraphRAG builds an entity-relationship knowledge graph with community summarization. It is superior for multi-hop reasoning, global cross-document synthesis, and entity relation queries."),

        ("Q14: How do you handle OCR glitches, ligatures, and scanning noise in PDF RAG?",
         "Implement regex-based OCR repair for common kerning issues (e.g. 'r ainfall' -> 'rainfall', 'P.T.O' removal), strip binary control characters, and use font ligature normalizers. For corrupt PDFs, implement fallback raw stream extraction to recover text inside content streams."),

        ("Q15: What is Late Chunking?",
         "Traditional chunking chunks first, then embeds each chunk in isolation. Late Chunking passes the entire document through a long-context transformer (e.g. jina-embeddings-v3), generates token-level contextualized embeddings that retain global document context, and then pools token vectors into chunk embeddings."),

        ("Q16: How do you prevent LLMs from going off on tangents when retrieved chunks contain adjacent curriculum topics?",
         "Use Chain-of-Evidence Prompting with strict negative constraints: (1) Explicit instruction: 'Answer ONLY what was asked. If the context contains adjacent topics, do not explain them unless requested.' (2) Require structured sections (Executive Summary, Mechanism, Citations). (3) Lower temperature to 0.1-0.3."),

        ("Q17: How does HNSW (Hierarchical Navigable Small World) work for vector indexing?",
         "HNSW builds a multi-layer graph where upper layers have long-range edges for fast coarse exploration (like skip-lists) and lower layers have dense local edges for fine-grained nearest neighbor search. It achieves logarithmic O(log N) search time with high recall."),

        ("Q18: What is Query Routing / Agentic RAG?",
         "Agentic RAG uses an LLM router to classify incoming user intent: (1) Direct answering for greetings; (2) Single-vector search for simple queries; (3) Multi-hop decomposition for complex comparisons; (4) SQL/Structured DB lookup for quantitative questions; (5) Web search for real-time data."),

        ("Q19: How do you optimize serverless RAG for sub-second latency?",
         "Techniques include: (1) Parallel sparse + dense search execution via Promise.all / asyncio; (2) In-memory BM25 caching; (3) Lazy loading heavy models (CrossEncoders/LLMs); (4) Quantized embeddings (int8/binary embeddings with Hamming distance); (5) Client-side sequential upload chunking to avoid 413 payload limits."),

        ("Q20: How do you choose the optimal chunk overlap percentage?",
         "Standard practice is 10-20% overlap (e.g., 800-character chunk with 150-character overlap). Zero overlap risks splitting entities across boundaries; excessive overlap (>30%) causes redundant near-duplicate chunks in the candidate pool, wasting context window slots."),

        ("Q21: How do you evaluate and tune the RRF constant k?",
         "The constant k (default 60) acts as a dampener on rank impact. Small k (<20) gives immense weight to top-3 items; large k (>100) flattens rank differences. Tuning is done via grid search on a validation set maximizing NDCG@K and Mean Reciprocal Rank (MRR)."),

        ("Q22: What is the 'Table of Contents / Index Keyword Hub' trap and how do you rectify it?",
         "Syllabi, Tables of Contents, and Book Indexes contain dense clusters of all keywords, absorbing BM25 scores without containing explanatory text. Rectify by: (1) Detecting TOC patterns (repeated 'Lecture XX:', 'Module I', 'SYLLABUS'); (2) Applying structural score penalties for conceptual queries; (3) Rewarding explanatory discourse markers ('is a', 'defined as', 'can only be'); (4) Using N-gram exact phrase matching."),

        ("Q23: How do you handle multi-modal documents (PDFs with architectural diagrams and charts)?",
         "Use Vision-Language Models (e.g. Gemini 2.0 Flash / ColPali) to generate structured markdown summaries of tables and diagrams during ingestion. For image embeddings, store multi-modal vector representations in the same latent space as text chunks."),

        ("Q24: What is the difference between extractive and abstractive generation in RAG?",
         "Extractive synthesis pulls verbatim sentences and quotes directly from the context passages (zero hallucination risk, but lower coherence). Abstractive generation rephrases, summarizes, and connects ideas into natural language. Production systems use abstractive generation with strict in-line citation anchoring."),

        ("Q25: If you had to build a production RAG system from scratch today, what stack and architecture would you deploy?",
         "Full-stack Next.js/FastAPI with Serverless Edge endpoints; Hybrid BM25 Okapi + BGE-large/Gemini embeddings; Reciprocal Rank Fusion (k=60); ms-marco-MiniLM-L-6-v2 Cross-Encoder reranker; CRAG document noise filtering; Contextual retrieval during ingestion; Gemini 2.0 Flash generation with Self-RAG grounding verification; and Ragas for continuous CI/CD evaluation.")
    ]

    for i, (q, a) in enumerate(qa_list, 1):
        q_p = Paragraph(f"<b>{q}</b>", q_title_style)
        a_p = Paragraph(a.replace("\n", "<br/>"), ans_style)
        story.append(KeepTogether([q_p, a_p]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[PDF Generator] Successfully compiled handbook: {output_filename}")


if __name__ == "__main__":
    output = "Advanced_RAG_Architecture_and_Interview_Masterclass.pdf"
    if len(sys.argv) > 1:
        output = sys.argv[1]
    build_rag_handbook(output)
