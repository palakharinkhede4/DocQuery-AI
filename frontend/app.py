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
    page_title="Document Q&A System",
    page_icon="🔒",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize unique session ID for session isolation
if "session_id" not in st.session_state:
    st.session_state["session_id"] = uuid.uuid4().hex[:12]

session_id = st.session_state["session_id"]

# Custom CSS for modern UI
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        font-size: 1.0rem;
        color: #64748B;
        margin-bottom: 1.5rem;
    }
    .stButton>button {
        border-radius: 8px;
        font-weight: 600;
    }
    .badge-faiss {
        background-color: #1E3A8A;
        color: #60A5FA;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    .badge-local {
        background-color: #064E3B;
        color: #34D399;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
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

# Sidebar: Document Management & Config
with st.sidebar:
    st.markdown("""
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
        <span style="font-size: 2.2rem;">📚</span>
        <h2 style="margin: 0; padding: 0; font-size: 1.4rem; font-weight: 700; color: #F1F5F9;">Document Knowledge Base</h2>
    </div>
    """, unsafe_allow_html=True)
    st.caption(f"Session ID: `{session_id}`")

    # Backend Connection Status
    if health_info:
        st.markdown("Status: 🟢 **Connected**", unsafe_allow_html=True)
        st.markdown("Vector Store: <span class='badge-faiss'>FAISS (Session Isolated)</span>", unsafe_allow_html=True)
        st.markdown("LLM Engine: <span class='badge-local'>Gemini Flash / LLM API</span>", unsafe_allow_html=True)
    else:
        st.info("ℹ️ Direct Session Mode (FAISS Isolated)")

    st.divider()

    # Dynamic File Upload Section
    st.subheader("📤 Upload Documents")
    uploaded_files = st.file_uploader(
        "Choose PDF, DOCX, TXT, or MD files",
        type=["pdf", "docx", "txt", "md"],
        accept_multiple_files=True
    )

    if uploaded_files:
        if st.button("🚀 Process Uploaded Files", use_container_width=True):
            progress_bar = st.progress(0, text="Initializing document processing...")

            def update_upload_progress(pct, msg):
                val = min(max(float(pct), 0.0), 1.0)
                progress_bar.progress(val, text=f"{int(val * 100)}% — {msg}")

            files_payload = []
            file_objs = []
            for file in uploaded_files:
                f_bytes = file.getvalue()
                files_payload.append(("files", (file.name, f_bytes, file.type)))
                file_objs.append({"name": file.name, "content": f_bytes})

            try:
                if health_info:
                    update_upload_progress(0.2, "Uploading files to FastAPI backend...")
                    res = requests.post(f"{API_URL}/upload?session_id={session_id}", files=files_payload)
                    data = res.json()
                    update_upload_progress(1.0, f"✅ Ingested {data.get('total_chunks', 0)} chunks across {len(data.get('processed_files', []))} document(s)!")
                else:
                    from src.ingest import ingest_file_objects
                    data = ingest_file_objects(file_objs, session_id=session_id, progress_callback=update_upload_progress)

                st.success(f"✅ Ingested {data.get('total_chunks', 0)} chunks!")
                st.rerun()
            except Exception as e:
                st.error(f"Failed to ingest: {e}")

    # Demo Documents Button
    if st.button("⚡ Load Demo Docs (12 Sample Topics)", type="primary", use_container_width=True):
        progress_bar = st.progress(0, text="Loading 12 sample demo documents...")

        def update_demo_progress(pct, msg):
            val = min(max(float(pct), 0.0), 1.0)
            progress_bar.progress(val, text=f"{int(val * 100)}% — {msg}")

        try:
            if health_info:
                update_demo_progress(0.3, "Requesting backend demo document ingestion...")
                res = requests.post(f"{API_URL}/ingest-demo?session_id={session_id}")
                data = res.json()
                update_demo_progress(1.0, "Demo docs ingested!")
            else:
                from src.ingest import ingest_directory
                data = ingest_directory(session_id=session_id, progress_callback=update_demo_progress)

            st.success(f"✅ Ingested {data.get('total_chunks', 0)} chunks from 12 Demo Docs!")
            st.rerun()
        except Exception as e:
            st.error(f"Failed to load demo docs: {e}")

    st.divider()

    # Active Documents Stats for Current Session
    st.subheader("📊 Session Indexed Documents")
    try:
        if health_info:
            doc_data = requests.get(f"{API_URL}/documents?session_id={session_id}").json()
        else:
            from src.vectorstore import get_vector_store
            doc_data = get_vector_store(session_id=session_id).get_documents()

        files_list = doc_data.get("files", [])
        total_chunks = doc_data.get("total_chunks", 0)

        st.metric("Session Total Chunks", total_chunks)
        if files_list:
            for file_name in files_list:
                st.caption(f"• 📄 `{file_name}`")
        else:
            st.info("No documents uploaded in this session yet.")
    except Exception as e:
        st.caption("Unable to fetch document stats.")

    st.divider()
    if st.button("🗑️ Reset Session & Clear Vectors", type="secondary", use_container_width=True):
        try:
            if health_info:
                requests.delete(f"{API_URL}/documents?session_id={session_id}")
            else:
                from src.vectorstore import clear_session_store
                clear_session_store(session_id)

            # Clear session state and generate new session ID
            st.session_state["session_id"] = uuid.uuid4().hex[:12]
            st.session_state["chat_history"] = []
            st.success("Session reset & vector store cleaned!")
            st.rerun()
        except Exception as e:
            st.error(f"Error resetting session: {e}")


# Main Header
st.markdown("<div class='main-header'>🔒 Document Q&A System</div>", unsafe_allow_html=True)
st.markdown("<div class='sub-header'>Session-Isolated RAG powered by FAISS Vector Search & LLM Engine</div>", unsafe_allow_html=True)

# Tabs
tab1, tab2, tab3 = st.tabs(["💬 Conversational Q&A", "🔍 Semantic Document Search", "⚙️ Architecture"])

# Tab 1: Chat Interface
with tab1:
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # Pinned Question Box at top
    with st.form(key="qa_form", clear_on_submit=True):
        user_query = st.text_input("Ask a question about your uploaded documents:", placeholder="Type your question here...")
        submit_button = st.form_submit_button("Ask Question 🚀", use_container_width=True)

    if submit_button and user_query.strip():
        with st.spinner("Searching session FAISS index & synthesizing answer..."):
            try:
                if health_info:
                    res = requests.post(f"{API_URL}/ask", json={"query": user_query, "top_k": 4, "session_id": session_id})
                    response_data = res.json()
                else:
                    from src.pipeline import run_pipeline
                    response_data = run_pipeline(user_query, top_k=4, session_id=session_id)

                answer = response_data.get("answer", "No response generated.")
                sources = response_data.get("sources", [])

                # Insert newest question at top of history
                st.session_state.chat_history.insert(0, {
                    "question": user_query,
                    "answer": answer,
                    "sources": sources
                })
            except Exception as e:
                st.error(f"Error executing query: {e}")

    # Display conversation history with latest question ON TOP
    if st.session_state.chat_history:
        st.subheader("💡 Q&A History")
        for idx, item in enumerate(st.session_state.chat_history):
            with st.container():
                st.markdown(f"#### ❓ Question #{len(st.session_state.chat_history) - idx}: {item['question']}")
                st.markdown(item["answer"])

                if item.get("sources"):
                    with st.expander("📚 View Source Citations & References"):
                        for src in item["sources"]:
                            st.markdown(f"**📄 Document**: `{src['source']}` (Page {src['page']}) | *Similarity: {src['score']}*")
                            st.caption(f"\"{src['full_text']}\"")
                            st.divider()

                st.divider()

# Tab 2: Semantic Document Search Sandbox
with tab2:
    st.subheader("🔍 Explore Session FAISS Vector Search Results")
    search_query = st.text_input("Enter search keywords or phrase:")
    top_k_val = st.slider("Top Results (K)", min_value=1, max_value=10, value=4)

    if st.button("Search Index"):
        if search_query:
            with st.spinner("Retrieving local vector matches..."):
                from src.retriever import retrieve
                results = retrieve(search_query, top_k=top_k_val, session_id=session_id)

                if not results:
                    st.warning("No matches found in session FAISS index.")
                else:
                    for i, r in enumerate(results, 1):
                        st.markdown(f"### Match #{i} — `{r['source']}` (Page {r['page']})")
                        st.progress(min(max(float(r['score']), 0.0), 1.0))
                        st.info(f"**Similarity Score**: {r['score']}")
                        st.text_area(f"Chunk Text #{i}", r['text'], height=150)
                        st.divider()

# Tab 3: System Architecture
with tab3:
    st.subheader("🏗️ Session-Isolated RAG Architecture")
    st.markdown("""
    ### Privacy & Isolation Features

    ```
    ┌────────────────┐       ┌─────────────────┐       ┌────────────────────────┐
    │ User Document  │ ────> │ Parser & Chunker│ ────> │ BGE Embedding Model    │
    │ (PDF/DOCX/TXT) │       │ (Page Metadata) │       │ (Local HuggingFace)    │
    └────────────────┘       └─────────────────┘       └────────────────────────┘
                                                                    │
                                                                    ▼
    ┌────────────────┐       ┌─────────────────┐       ┌────────────────────────┐
    │ Streamlit UI / │ <──── │ LLM Engine      │ <──── │ Isolated Session FAISS │
    │ FastAPI Backend│       │ (Gemini / RAG)  │       │ (vectorstore/session)  │
    └────────────────┘       └─────────────────┘       └────────────────────────┘
    ```

    #### Key Session Privacy & Cleanup Features:
    - **Session Isolation**: Every browser tab gets a unique `Session ID`. Documents and vectors uploaded in one session never leak into another user's session.
    - **Session Cleanup**: Resetting or closing a session automatically deletes vector index files from disk.
    - **Zero Data Accumulation**: Prevents indefinite vector piling up over time.
    """)