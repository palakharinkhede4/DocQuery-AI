import sys
import os

# Ensure project root directory is included in sys.path for Streamlit Cloud deployment
sys_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if sys_root not in sys.path:
    sys.path.insert(0, sys_root)

import streamlit as st
import requests

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

st.set_page_config(
    page_title="Local Technical Doc Q&A System",
    page_icon="🔒",
    layout="wide",
    initial_sidebar_state="expanded"
)

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
        res = requests.get(f"{API_URL}/health", timeout=3)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return None


health_info = check_backend()

# Sidebar: Document Management & Config
with st.sidebar:
    st.image("https://img.icons8.com/isometric-folders/100/database.png", width=60)
    st.title("Local Knowledge Base")

    # Backend Connection Status
    if health_info:
        st.markdown("Status: 🟢 **Connected**", unsafe_allow_html=True)
        st.markdown("Vector Store: <span class='badge-faiss'>FAISS (Local)</span>", unsafe_allow_html=True)
        st.markdown("Mode: <span class='badge-local'>100% Offline / Private</span>", unsafe_allow_html=True)
    else:
        st.info("ℹ️ Running in Direct Ingestion Mode (FAISS Local)")

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
            with st.spinner("Parsing text, generating local embeddings & indexing..."):
                files_payload = []
                for file in uploaded_files:
                    files_payload.append(("files", (file.name, file.getvalue(), file.type)))

                try:
                    if health_info:
                        res = requests.post(f"{API_URL}/upload", files=files_payload)
                        data = res.json()
                        st.success(f"✅ Ingested {data.get('total_chunks', 0)} chunks across {len(data.get('processed_files', []))} document(s)!")
                    else:
                        from src.ingest import ingest_file_objects
                        file_objs = [{"name": f.name, "content": f.getvalue()} for f in uploaded_files]
                        data = ingest_file_objects(file_objs)
                        st.success(f"✅ Ingested {data.get('total_chunks', 0)} chunks locally!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to ingest: {e}")

    # Demo Documents Button
    if st.button("⚡ Load Demo Docs (12 Tech Topics)", type="primary", use_container_width=True):
        with st.spinner("Loading pre-loaded 12 technical documents..."):
            try:
                if health_info:
                    res = requests.post(f"{API_URL}/ingest-demo")
                    data = res.json()
                else:
                    from src.ingest import ingest_directory
                    data = ingest_directory()
                st.success(f"✅ Ingested {data.get('total_chunks', 0)} chunks from 12 Demo Tech Docs!")
                st.rerun()
            except Exception as e:
                st.error(f"Failed to load demo docs: {e}")

    st.divider()

    # Active Documents Stats
    st.subheader("📊 Indexed Documents")
    try:
        if health_info:
            doc_data = requests.get(f"{API_URL}/documents").json()
        else:
            from src.vectorstore import get_vector_store
            doc_data = get_vector_store().get_documents()

        files_list = doc_data.get("files", [])
        total_chunks = doc_data.get("total_chunks", 0)

        st.metric("Total Indexed Chunks", total_chunks)
        if files_list:
            for file_name in files_list:
                st.caption(f"• 📄 `{file_name}`")
        else:
            st.info("No documents uploaded yet. Click 'Load Demo Docs' above to try immediately!")
    except Exception as e:
        st.caption("Unable to fetch document stats.")

    st.divider()
    if st.button("🗑️ Clear Vector Index", type="secondary", use_container_width=True):
        try:
            if health_info:
                requests.delete(f"{API_URL}/documents")
            else:
                from src.vectorstore import get_vector_store
                get_vector_store().clear()
            st.success("FAISS local index cleared!")
            st.rerun()
        except Exception as e:
            st.error(f"Error clearing index: {e}")


# Main Header
st.markdown("<div class='main-header'>🔒 Local Technical Document Q&A System</div>", unsafe_allow_html=True)
st.markdown("<div class='sub-header'>100% Private, Offline RAG powered by local FAISS vector search & local LLM</div>", unsafe_allow_html=True)

# Tabs
tab1, tab2, tab3 = st.tabs(["💬 Conversational Q&A", "🔍 Semantic Document Search", "⚙️ Architecture"])

# Tab 1: Chat Interface
with tab1:
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # Pinned Question Box at top
    with st.form(key="qa_form", clear_on_submit=True):
        user_query = st.text_input("Ask a question about your technical documents:", placeholder="Type your question here...")
        submit_button = st.form_submit_button("Ask Question 🚀", use_container_width=True)

    if submit_button and user_query.strip():
        with st.spinner("Searching local FAISS index & synthesizing answer..."):
            try:
                if health_info:
                    res = requests.post(f"{API_URL}/ask", json={"query": user_query, "top_k": 4})
                    response_data = res.json()
                else:
                    from src.pipeline import run_pipeline
                    response_data = run_pipeline(user_query, top_k=4)

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
        st.subheader("💡 Q&A History (Latest Question First)")
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
    st.subheader("🔍 Explore FAISS Vector Search Results")
    search_query = st.text_input("Enter search keywords or phrase:")
    top_k_val = st.slider("Top Results (K)", min_value=1, max_value=10, value=4)

    if st.button("Search Index"):
        if search_query:
            with st.spinner("Retrieving local vector matches..."):
                from src.retriever import retrieve
                results = retrieve(search_query, top_k=top_k_val)

                if not results:
                    st.warning("No matches found in local FAISS index.")
                else:
                    for i, r in enumerate(results, 1):
                        st.markdown(f"### Match #{i} — `{r['source']}` (Page {r['page']})")
                        st.progress(min(max(float(r['score']), 0.0), 1.0))
                        st.info(f"**Similarity Score**: {r['score']}")
                        st.text_area(f"Chunk Text #{i}", r['text'], height=150)
                        st.divider()

# Tab 3: System Architecture
with tab3:
    st.subheader("🏗️ 100% Local RAG Architecture")
    st.markdown("""
    ### Privacy-First Technical Workflow

    ```
    ┌────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
    │ User Document  │ ────> │ Parser & Chunker│ ────> │ BGE Embedding Model  │
    │ (PDF/DOCX/TXT) │       │ (Page Metadata) │       │ (Local HuggingFace)  │
    └────────────────┘       └─────────────────┘       └──────────────────────┘
                                                                  │
                                                                  ▼
    ┌────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
    │ Streamlit UI / │ <──── │ Local LLM       │ <──── │ Local FAISS Index    │
    │ FastAPI Backend│       │ (TinyLlama HF)  │       │ (vectorstore/index)  │
    └────────────────┘       └─────────────────┘       └──────────────────────┘
    ```

    #### Key Privacy Features:
    - **Zero External API Calls**: Completely self-contained; no data ever leaves your local machine.
    - **FAISS Vector Database**: Fast local vector search persisted on disk.
    - **Multi-Format Extraction**: PDF, DOCX, TXT, and Markdown support.
    - **Pre-loaded Demo Knowledge Base**: 12 technical AI/ML documents included for instant testing.
    """)