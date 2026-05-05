import streamlit as st
import requests

st.set_page_config(page_title="Local RAG QnA", layout="centered")

st.title("📄 Local RAG QnA")
st.caption("Ask questions based on your technical documents")

query = st.text_input("Ask your question:")

if st.button("Ask"):
    if query:
        with st.spinner("Thinking..."):
            response = requests.post(
                "http://127.0.0.1:8000/ask",
                json={"query": query}
            )

            answer = response.json()["answer"]

        st.markdown("### ❓ Question")
        st.write(query)

        st.markdown("### 💡 Answer")
        st.success(answer)