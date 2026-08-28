import sys
import os
import uuid

sys_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if sys_root not in sys.path:
    sys.path.insert(0, sys_root)

import streamlit as st
import requests

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

st.set_page_config(
    page_title="DocQuery AI — Document Assistant",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

if "session_id" not in st.session_state:
    st.session_state["session_id"] = uuid.uuid4().hex[:12]

session_id = st.session_state["session_id"]

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
        <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #F8FAFC;">DocQuery</h2>
        <span style="font-size: 0.85rem; color: #94A3B8;">Document Assistant</span>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f"**Loaded Documents ({len(files_list)})**")

    if files_list:
        for fname in files_list:
            st.caption(f"• {fname}")
    else:
        st.caption("No documents loaded yet.")

    st.divider()

    # Reset Workspace Button
    if st.button("Start New Session", type="secondary", use_container_width=True):
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
st.markdown("<div class='brand-title'>DocQuery</div>", unsafe_allow_html=True)
st.markdown("<div class='brand-subtitle'>Ask any question across your uploaded documents</div>", unsafe_allow_html=True)

# Main Hero / Document Workspace
if total_chunks == 0:
    st.markdown("""
    <div class='hero-card'>
        <div class='hero-title'>Upload Documents to Begin</div>
        <div class='hero-desc'>Upload your PDF, DOCX, TXT, or Markdown documents to start asking questions.</div>
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
            if st.button("Upload & Process Documents", type="primary", use_container_width=True):
                progress_bar = st.progress(0, text="Reading documents...")

                def update_upload_progress(pct, msg):
                    val = min(max(float(pct), 0.0), 1.0)
                    progress_bar.progress(val, text=f"{int(val * 100)}% — {msg}")

                files_payload = [("files", (f.name, f.getvalue(), f.type)) for f in uploaded_files]
                file_objs = [{"name": f.name, "content": f.getvalue()} for f in uploaded_files]

                try:
                    if health_info:
                        update_upload_progress(0.3, "Processing on server...")
                        requests.post(f"{API_URL}/upload?session_id={session_id}", files=files_payload)
                        update_upload_progress(1.0, "Ready!")
                    else:
                        from src.ingest import ingest_file_objects
                        ingest_file_objects(file_objs, session_id=session_id, progress_callback=update_upload_progress)

                    st.success("Documents processed successfully!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {e}")

    with col2:
        if st.button("Load Sample Documents", use_container_width=True):
            progress_bar = st.progress(0, text="Loading sample documents...")

            def update_demo_progress(pct, msg):
                val = min(max(float(pct), 0.0), 1.0)
                progress_bar.progress(val, text=f"{int(val * 100)}% — {msg}")

            try:
                if health_info:
                    requests.post(f"{API_URL}/ingest-demo?session_id={session_id}")
                else:
                    from src.ingest import ingest_directory
                    ingest_directory(session_id=session_id, progress_callback=update_demo_progress)

                st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")

else:
    with st.expander("Add More Documents"):
        more_files = st.file_uploader(
            "Add PDF, DOCX, TXT, or MD files",
            type=["pdf", "docx", "txt", "md"],
            accept_multiple_files=True
        )
        if more_files and st.button("Process Additional Documents", type="primary"):
            progress_bar = st.progress(0, text="Reading files...")

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

    # Conversational Q&A Form
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    with st.form(key="qa_form", clear_on_submit=True):
        user_query = st.text_input("Ask a question about your documents:", placeholder="e.g. What are the key concepts and examples described?")
        submit_button = st.form_submit_button("Ask Question", type="primary", use_container_width=True)

    if submit_button and user_query.strip():
        with st.spinner("Finding answer..."):
            try:
                payload = {
                    "query": user_query,
                    "top_k": 4,
                    "min_score": 0.20,
                    "session_id": session_id,
                    "use_hybrid": True,
                    "use_reranking": True,
                    "use_hyde": False,
                    "use_crag": True,
                    "use_self_rag": True
                }

                if health_info:
                    res = requests.post(f"{API_URL}/ask", json=payload)
                    response_data = res.json()
                else:
                    from src.pipeline import run_pipeline
                    response_data = run_pipeline(
                        query=user_query,
                        top_k=4,
                        session_id=session_id,
                        min_score=0.20,
                        use_hybrid=True,
                        use_reranking=True,
                        use_hyde=False,
                        use_crag=True,
                        use_self_rag=True
                    )

                answer = response_data.get("answer", "No response generated.")
                sources = response_data.get("sources", [])
                self_rag_info = response_data.get("self_rag", {})

                st.session_state.chat_history.insert(0, {
                    "question": user_query,
                    "answer": answer,
                    "sources": sources,
                    "self_rag": self_rag_info
                })
            except Exception as e:
                st.error(f"Error: {e}")

    # Conversation History Display
    if st.session_state.chat_history:
        st.markdown("### Answers")
        for idx, item in enumerate(st.session_state.chat_history):
            with st.container():
                st.markdown(f"#### {item['question']}")
                st.markdown("<span class='badge-grounded'>Source Verified</span>", unsafe_allow_html=True)
                st.markdown(item["answer"])

                # Clean Source Citations
                if item.get("sources"):
                    with st.expander(f"View Sources ({len(item['sources'])} referenced)"):
                        for src in item["sources"]:
                            st.markdown(f"**Document**: `{src['source']}` (Page {src['page']})")
                            st.caption(f"\"{src['full_text']}\"")
                            st.divider()

                st.divider()