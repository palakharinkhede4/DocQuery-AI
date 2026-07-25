import os
import re
import sys
from config import LLM_MODEL, MAX_TOKENS


def is_cloud_environment():
    """Detect if running in RAM-constrained Streamlit Cloud or <4GB container."""
    if os.getenv("DISABLE_HEAVY_LLM", "0") == "1":
        return True

    abs_path = os.path.abspath(__file__).replace("\\", "/")
    if "/mount/src" in abs_path or "/home/adminuser" in abs_path:
        return True

    if any("STREAMLIT" in k for k in os.environ):
        return True

    try:
        if os.path.exists("/proc/meminfo"):
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        kb = int(line.split()[1])
                        gb = kb / (1024 * 1024)
                        if gb < 4.0:
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
                "content": "You are an expert technical assistant. Synthesize a clean, direct, beautifully structured markdown answer based ONLY on the provided context."
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {query}"
            }
        ],
        max_tokens=MAX_TOKENS,
        temperature=0.2
    )
    return response.choices[0].message.content.strip()


def clean_text_glitches(text):
    """Repair PDF OCR / kerning glitches in context string."""
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
        "Anon-permeable": "A non-permeable",
        "acoarse": "a coarse"
    }
    for glitch, fix in glitches.items():
        text = re.sub(re.escape(glitch), fix, text, flags=re.IGNORECASE)

    text = re.sub(r'\b([a-zA-Z])\s+([a-zA-Z]{2,})\b', r'\1\2', text)
    text = re.sub(r'\b([a-zA-Z]{2,})\s+([a-zA-Z])\b', r'\1\2', text)
    return text


def synthesize_extractive_answer(context, query):
    """
    Production-Grade RAG Context Synthesizer.
    Calculates query-sentence relevance to extract precise, fluent answers.
    """
    if not context or not context.strip():
        return "No relevant information found in the document context."

    context_clean = clean_text_glitches(context)
    lines = [l.strip() for l in context_clean.split("\n") if l.strip() and not l.startswith("[Source:")]

    if not lines:
        return "No relevant text found in document context."

    # Extract distinct sentences and bullet points
    candidate_units = []
    for line in lines:
        if line.startswith(('•', '-', '*')):
            candidate_units.append(line)
        else:
            sentences = re.split(r'(?<=[.!?])\s+', line)
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) > 20:
                    candidate_units.append(s_clean)

    query_keywords = set(re.findall(r'\w+', query.lower())) - {
        'what', 'is', 'a', 'an', 'the', 'does', 'do', 'of', 'in', 'and', 'to', 'for', 'are', 'were', 'which'
    }

    scored = []
    for unit in candidate_units:
        score = 0
        u_lower = unit.lower()

        # Word overlap score
        for kw in query_keywords:
            if len(kw) > 2 and kw in u_lower:
                score += 5

        # Explicit phrase match for overview/consists
        if "consists of" in query.lower() and "consists of" in u_lower:
            score += 15

        if any(w in u_lower for w in ['consists', 'made from', 'include', 'components', 'diverts', 'stores', 'allows', 'used to', 'cleaning', 'flushed']):
            score += 4

        if unit.startswith(('•', '-', '*')):
            score += 2

        scored.append((score, unit))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_candidates = [unit for score, unit in scored if score > 3]

    if not top_candidates:
        top_candidates = [unit for score, unit in scored[:3]]

    is_component_query = any(k in query.lower() for k in ['component', 'parts', 'elements'])

    if is_component_query and len(top_candidates) > 1:
        bullets_list = []
        seen = set()
        for c in top_candidates[:12]:
            clean_c = re.sub(r'^[•\-\*\d+\.]\s*', '', c).strip()
            if clean_c[:40] not in seen:
                seen.add(clean_c[:40])
                if ":" in clean_c and not clean_c.startswith("http"):
                    parts = clean_c.split(":", 1)
                    bullets_list.append(f"- **{parts[0].strip()}**: {parts[1].strip()}")
                else:
                    bullets_list.append(f"- {clean_c}")
        return "**Key Components & System Details:**\n\n" + "\n".join(bullets_list)

    unique_answers = []
    seen_txt = set()
    for item in top_candidates[:3]:
        clean_item = re.sub(r'^[•\-\*\d+\.]\s*', '', item).strip()
        if clean_item[:30] not in seen_txt:
            seen_txt.add(clean_item[:30])
            unique_answers.append(clean_item)

    return "\n\n".join(unique_answers)


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
    3. Fallback to Production-Grade RAG Synthesizer (on Streamlit Cloud 1GB RAM container).
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