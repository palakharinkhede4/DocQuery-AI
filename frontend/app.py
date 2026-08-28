import sys
import os
import uuid

# Ensure project root directory is included in sys.path for Streamlit Cloud deployment
sys_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if sys_root not in sys.path:
    sys.path.insert(0, sys_root)

import streamlit as st
import requests

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

st.set_page_config(
    page_title="DocQuery AI — Advanced Multi-Stage RAG",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize unique session ID for session isolation
if "session_id" not in st.session_state:
    st.session_state["session_id"] = uuid.uuid4().hex[:12]

session_id = st.session_state["session_id"]

# Custom CSS for production SaaS UI aesthetics
st.markdown("""
<style>
    .brand-title {
        font-size: 2.2rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #F8FAFC;
        margin-bottom: 0.1rem;
    }
    .brand-subtitle {
        font-size: 0.95rem;
        color: #94A3B8;
        margin-bottom: 1.5rem;
    }
    .hero-card {
        background: #1E293B;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 1.5rem;
    }
    .hero-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #F8FAFC;
        margin-bottom: 0.4rem;
    }
    .hero-desc {
        font-size: 0.9rem;
        color: #94A3B8;
        margin-bottom: 1.2rem;
    }
    .badge-rag {
        background-color: #1E3A8A;
        color: #93C5FD;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge-grounded {
        background-color: #064E3B;
        color: #6EE7B7;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .stButton>button {
        border-radius: 6px;
        font-weight: 600;
        padding: 0.4rem 1rem;
    }
</style>
""", unsafe_allow_html=True)


def check_backend():
    try:
        res = requests.get(f"{API_URL}/health?session_id={session_id}", timeout=3)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return None


health_info = check_backend()

# Fetch active document stats
doc_data = {"files": [], "total_chunks": 0}
try:
    if health_info:
        doc_data = requests.get(f"{API_URL}/documents?session_id={session_id}").json()
    else:
        from src.vectorstore import get_vector_store
        doc_data = get_vector_store(session_id=session_id).get_documents()
except Exception:
    pass

files_list = doc_data.get("files", [])
total_chunks = doc_data.get("total_chunks", 0)

# Sidebar Layout
with st.sidebar:
    st.markdown("""
    <div style="margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #F8FAFC;">DocQuery AI</h2>
        <span style="font-size: 0.8rem; color: #94A3B8;">Advanced Multi-Stage RAG Architecture</span>
    </div>
    """, unsafe_allow_html=True)
    st.caption(f"Session ID: `{session_id}`")
    st.divider()

    # Advanced RAG Controls
    st.markdown("**⚡ Advanced RAG Controls**")
    use_hybrid = st.toggle("Hybrid Search (Dense + BM25 + RRF)", value=True, help="Combines sparse keyword search with dense vector embeddings using Reciprocal Rank Fusion.")
    use_rerank = st.toggle("Cross-Encoder Reranking", value=True, help="Multi-pass joint cross-attention rescoring of candidate passages.")
    use_hyde = st.toggle("HyDE Query Expansion", value=False, help="Generates a hypothetical technical answer to bridge semantic question-answer gaps.")
    use_crag = st.toggle("CRAG Document Grading", value=True, help="Corrective RAG layer that evaluates chunk relevance and filters out irrelevant noise.")
    use_self_rag = st.toggle("Self-RAG Grounding Verification", value=True, help="Calculates faithfulness and context support score on generated answer.")

    with st.expander("Retrieval Hyperparameters", expanded=False):
        top_k = st.slider("Top-K Passages", min_value=1, max_value=8, value=4)
        min_score = st.slider("Min Relevance Threshold", min_value=0.1, max_value=0.8, value=0.35, step=0.05)

    st.divider()

    # Session Documents Info
    st.markdown("**Active Session Knowledge Base**")
    st.metric("Total Indexed Chunks", total_chunks)

    if files_list:
        st.caption("Indexed files:")
        for fname in files_list:
            st.caption(f"• `{fname}`")
    else:
        st.caption("No documents ingested yet.")

    st.divider()

    # Reset Workspace Button
    if st.button("Reset Session Workspace", type="secondary", use_container_width=True):
        try:
            if health_info:
                requests.delete(f"{API_URL}/documents?session_id={session_id}")
            else:
                from src.vectorstore import clear_session_store
                clear_session_store(session_id)

            st.session_state["session_id"] = uuid.uuid4().hex[:12]
            st.session_state["chat_history"] = []
            st.rerun()
        except Exception as e:
            st.error(f"Reset error: {e}")


# Main Header
st.markdown("<div class='brand-title'>DocQuery AI</div>", unsafe_allow_html=True)
st.markdown("<div class='brand-subtitle'>Advanced Multi-Stage RAG Architecture (Hybrid BM25 + FAISS Dense + RRF + Cross-Encoder + CRAG + Self-RAG)</div>", unsafe_allow_html=True)

# Main Hero / Document Workspace
if total_chunks == 0:
    st.markdown("""
    <div class='hero-card'>
        <div class='hero-title'>Upload Documents to Begin</div>
        <div class='hero-desc'>Upload your technical PDF, DOCX, TXT, or Markdown documents to parse, index, and query with state-of-the-art RAG architecture.</div>
    </div>
    """, unsafe_allow_html=True)

    uploaded_files = st.file_uploader(
        "Upload files (PDF, DOCX, TXT, MD)",
        type=["pdf", "docx", "txt", "md"],
        accept_multiple_files=True,
        label_visibility="collapsed"
    )

    col1, col2 = st.columns([3, 1])

    with col1:
        if uploaded_files:
            if st.button("Process Uploaded Documents", type="primary", use_container_width=True):
                progress_bar = st.progress(0, text="Initializing ingestion pipeline...")

                def update_upload_progress(pct, msg):
                    val = min(max(float(pct), 0.0), 1.0)
                    progress_bar.progress(val, text=f"{int(val * 100)}% — {msg}")

                files_payload = [("files", (f.name, f.getvalue(), f.type)) for f in uploaded_files]
                file_objs = [{"name": f.name, "content": f.getvalue()} for f in uploaded_files]

                try:
                    if health_info:
                        update_upload_progress(0.2, "Uploading to API server...")
                        res = requests.post(f"{API_URL}/upload?session_id={session_id}", files=files_payload)
                        data = res.json()
                        update_upload_progress(1.0, f"Ingested {data.get('total_chunks', 0)} chunks!")
                    else:
                        from src.ingest import ingest_file_objects
                        data = ingest_file_objects(file_objs, session_id=session_id, progress_callback=update_upload_progress)

                    st.success(f"Successfully processed {data.get('total_chunks', 0)} document chunks!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Processing error: {e}")

    with col2:
        with st.popover("Just testing the app?"):
            st.caption("Load 14 sample documents to test DocQuery AI instantly.")
            if st.button("Load Sample Demo Docs", use_container_width=True):
                progress_bar = st.progress(0, text="Loading demo documents...")

                def update_demo_progress(pct, msg):
                    val = min(max(float(pct), 0.0), 1.0)
                    progress_bar.progress(val, text=f"{int(val * 100)}% — {msg}")

                try:
                    if health_info:
                        update_demo_progress(0.3, "Requesting demo ingestion...")
                        res = requests.post(f"{API_URL}/ingest-demo?session_id={session_id}")
                        data = res.json()
                        update_demo_progress(1.0, "Ingestion complete!")
                    else:
                        from src.ingest import ingest_directory
                        data = ingest_directory(session_id=session_id, progress_callback=update_demo_progress)

                    st.rerun()
                except Exception as e:
                    st.error(f"Demo loading error: {e}")

else:
    # Workspace when documents ARE loaded
    st.markdown(f"**Active Knowledge Base**: {len(files_list)} file(s) indexed ({total_chunks} vector & BM25 chunks)")

    with st.expander("Add More Documents"):
        more_files = st.file_uploader(
            "Add PDF, DOCX, TXT, or MD files",
            type=["pdf", "docx", "txt", "md"],
            accept_multiple_files=True
        )
        if more_files and st.button("Process Additional Documents", type="primary"):
            progress_bar = st.progress(0, text="Processing files...")

            def update_more_progress(pct, msg):
                val = min(max(float(pct), 0.0), 1.0)
                progress_bar.progress(val, text=f"{int(val * 100)}% — {msg}")

            file_objs = [{"name": f.name, "content": f.getvalue()} for f in more_files]
            files_payload = [("files", (f.name, f.getvalue(), f.type)) for f in more_files]
            try:
                if health_info:
                    requests.post(f"{API_URL}/upload?session_id={session_id}", files=files_payload)
                else:
                    from src.ingest import ingest_file_objects
                    ingest_file_objects(file_objs, session_id=session_id, progress_callback=update_more_progress)
                st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")

    st.divider()

    # Conversational Q&A Form
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    with st.form(key="qa_form", clear_on_submit=True):
        user_query = st.text_input("Ask a technical question about your indexed documents:", placeholder="e.g. What are the key components and mechanisms described in the document?")
        submit_button = st.form_submit_button("Submit Question", type="primary", use_container_width=True)

    if submit_button and user_query.strip():
        with st.spinner("Running Multi-Stage RAG Pipeline (Hybrid Retrieval -> Rerank -> CRAG Grade -> Synthesis)..."):
            try:
                payload = {
                    "query": user_query,
                    "top_k": top_k,
                    "min_score": min_score,
                    "session_id": session_id,
                    "use_hybrid": use_hybrid,
                    "use_reranking": use_rerank,
                    "use_hyde": use_hyde,
                    "use_crag": use_crag,
                    "use_self_rag": use_self_rag
                }

                if health_info:
                    res = requests.post(f"{API_URL}/ask", json=payload)
                    response_data = res.json()
                else:
                    from src.pipeline import run_pipeline
                    response_data = run_pipeline(
                        query=user_query,
                        top_k=top_k,
                        session_id=session_id,
                        min_score=min_score,
                        use_hybrid=use_hybrid,
                        use_reranking=use_rerank,
                        use_hyde=use_hyde,
                        use_crag=use_crag,
                        use_self_rag=use_self_rag
                    )

                answer = response_data.get("answer", "No response generated.")
                sources = response_data.get("sources", [])
                trace = response_data.get("pipeline_trace", {})
                self_rag_info = response_data.get("self_rag", {})

                st.session_state.chat_history.insert(0, {
                    "question": user_query,
                    "answer": answer,
                    "sources": sources,
                    "trace": trace,
                    "self_rag": self_rag_info
                })
            except Exception as e:
                st.error(f"Error executing query: {e}")

    # Conversation History Display
    if st.session_state.chat_history:
        st.markdown("### Query Results")
        for idx, item in enumerate(st.session_state.chat_history):
            q_num = len(st.session_state.chat_history) - idx
            with st.container():
                st.markdown(f"#### Question #{q_num}: {item['question']}")

                # Self-RAG Grounding Badge
                self_rag = item.get("self_rag", {})
                if self_rag.get("verdict"):
                    score_pct = int(self_rag.get("grounding_score", 0.0) * 100)
                    st.markdown(f"<span class='badge-grounded'>Self-RAG Grounding: {self_rag.get('verdict')} ({score_pct}%)</span>", unsafe_allow_html=True)

                st.markdown(item["answer"])

                # RAG Pipeline Inspector
                trace = item.get("trace", {})
                if trace:
                    with st.expander("🔍 RAG Execution Pipeline Inspector", expanded=False):
                        if trace.get("hyde_expanded"):
                            st.caption(f"🔮 **HyDE Expanded Query:** {trace.get('hyde_query')}")
                        st.caption(f"⚙️ **Pipeline Steps Executed:**")
                        for s in trace.get("steps", []):
                            st.caption(f"• {s}")
                        crag = trace.get("crag_stats", {})
                        if crag:
                            st.caption(f"🛡️ **CRAG Confidence:** {int(crag.get('retrieval_confidence', 0)*100)}% | Relevant: {crag.get('relevant_count')} | Noise Filtered: {crag.get('filtered_count')}")

                # Source Citations
                if item.get("sources"):
                    with st.expander("📚 View Source Citations & References"):
                        for src in item["sources"]:
                            grade_badge = f"[{src.get('crag_grade', 'RELEVANT')}]"
                            st.markdown(f"**Document**: `{src['source']}` (Page {src['page']}) | *Score: {src['score']}* | {grade_badge}")
                            st.caption(f"\"{src['full_text']}\"")
                            st.divider()

                st.divider()

st.divider()

# System Architecture & Technical Specifications
with st.expander("Advanced RAG Architecture & Technical Specifications"):
    st.markdown("""
    ### Advanced Multi-Stage RAG Flow

    ```
    ┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
    │ User Technical Query    │ ────> │ 1. HyDE Query Expansion │ ────> │ 2. Sparse BM25 + FAISS  │
    └─────────────────────────┘       └─────────────────────────┘       └────────────┬────────────┘
                                                                                     │
                                                                                     ▼
    ┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
    │ 5. Self-RAG Grounding   │ <──── │ 4. Structured Synthesis │ <──── │ 3. RRF + Cross-Encoder  │
    │    & Output Citations   │       │    (Executive + Detail) │       │    + CRAG Noise Filter  │
    └─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
    ```

    - **Sparse BM25 + Dense FAISS (Hybrid Retrieval)**: Eliminates vector-only blind spots for technical terminology, proper nouns, and code IDs.
    - **Reciprocal Rank Fusion (RRF)**: Merges discrete rank orderings with mathematical normalization ($k=60$).
    - **Cross-Encoder Reranking**: Full cross-attention query-document scoring for maximum precision.
    - **Corrective RAG (CRAG)**: Filters out unrelated headers and irrelevant syllabus content before sending context to the generator.
    - **Self-RAG Grounding**: Verifies factual alignment and anti-hallucination compliance.
    """)