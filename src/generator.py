import os
import sys
from config import LLM_MODEL, MAX_TOKENS


def is_cloud_environment():
    """Detect if running in RAM-constrained Streamlit Cloud or <4GB container."""
    if os.getenv("DISABLE_HEAVY_LLM", "0") == "1":
        return True

    # Check container path indicators (/mount/src on Streamlit Cloud)
    abs_path = os.path.abspath(__file__).replace("\\", "/")
    if "/mount/src" in abs_path or "/home/adminuser" in abs_path:
        return True

    # Check Streamlit environment variables
    if any("STREAMLIT" in k for k in os.environ):
        return True

    # Check total system RAM via /proc/meminfo on Linux
    try:
        if os.path.exists("/proc/meminfo"):
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        kb = int(line.split()[1])
                        gb = kb / (1024 * 1024)
                        if gb < 4.0:  # Streamlit Cloud has ~1GB RAM
                            return True
    except Exception:
        pass

    return False


def get_api_key(key_name):
    """Fetch API key from environment variables or Streamlit secrets if available."""
    val = os.getenv(key_name, "")
    if not val:
        try:
            import streamlit as st
            val = st.secrets.get(key_name, "")
        except Exception:
            pass
    return val


def generate_answer_groq(context, query, api_key):
    import groq
    client = groq.Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful technical assistant. Answer the user question based ONLY on the provided context."
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {query}"
            }
        ],
        max_tokens=MAX_TOKENS,
        temperature=0.3
    )
    return response.choices[0].message.content.strip()


def synthesize_extractive_answer(context, query):
    """
    High-performance extractive synthesis for RAM-constrained environments.
    Extracts relevant context sentences directly grounding the answer without OOM crash.
    """
    lines = [line.strip() for line in context.split("\n") if line.strip() and not line.startswith("[Source:")]
    if not lines:
        return "No relevant information found in the document context."

    summary_paragraphs = "\n\n".join(lines[:3])
    return f"**Summary based on retrieved document context:**\n\n{summary_paragraphs}"


_local_tokenizer = None
_local_model = None


def get_local_llm():
    global _local_tokenizer, _local_model

    if is_cloud_environment():
        print("[Generator] RAM-constrained cloud environment detected (<4GB). Skipping heavy PyTorch CausalLM to prevent 1GB RAM OOM.")
        return None, None

    if _local_model is None:
        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM
            _local_tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL)
            _local_model = AutoModelForCausalLM.from_pretrained(
                LLM_MODEL,
                torch_dtype=torch.float32
            )
            _local_model.to("cpu")
        except Exception as e:
            print(f"Warning: Could not load local LLM ({e}). Using extractive synthesis mode.")
            return None, None
    return _local_tokenizer, _local_model


def generate_answer(context, query):
    """
    Generate answer:
    1. Check for API key (Groq) if set in Secrets/Env.
    2. Fallback to Local HuggingFace LLM (on local desktop with ample RAM).
    3. Fallback to Extractive RAG synthesis (on Streamlit Cloud 1GB RAM container).
    """
    if not context or not context.strip():
        return "I don't know based on the provided documents. No relevant context was found."

    # Check for optional Groq API key in secrets/env
    groq_key = get_api_key("GROQ_API_KEY")
    if groq_key:
        try:
            return generate_answer_groq(context, query, groq_key)
        except Exception as e:
            print(f"Groq API error ({e}). Falling back to local/extractive pipeline.")

    # Try local LLM (or extractive synthesis if cloud container)
    tokenizer, model = get_local_llm()

    if tokenizer is None or model is None:
        return synthesize_extractive_answer(context, query)

    prompt = f"""You are a technical assistant.
Answer ONLY using the provided context. If missing, say: "I don't know based on the document."

Context:
{context}

Question:
{query}

Final Answer:
"""
    try:
        inputs = tokenizer(prompt, return_tensors="pt")
        outputs = model.generate(
            **inputs,
            max_new_tokens=MAX_TOKENS,
            temperature=0.3,
            do_sample=True
        )
        decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
        if "Final Answer:" in decoded:
            return decoded.split("Final Answer:")[-1].strip()
        return decoded.strip()
    except Exception as e:
        return synthesize_extractive_answer(context, query)