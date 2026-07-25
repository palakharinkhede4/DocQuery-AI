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
                "content": "You are an expert technical assistant. Synthesize a clean, direct, beautifully structured markdown answer based ONLY on the provided context. Use bold headers and clean bullet points for components."
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
        "oper ation": "operation"
    }
    for glitch, fix in glitches.items():
        text = re.sub(re.escape(glitch), fix, text, flags=re.IGNORECASE)

    # Clean single-letter kerning spaces: 'c ollection' -> 'collection'
    text = re.sub(r'\b([a-zA-Z])\s+([a-zA-Z]{2,})\b', r'\1\2', text)
    text = re.sub(r'\b([a-zA-Z]{2,})\s+([a-zA-Z])\b', r'\1\2', text)
    return text


def synthesize_extractive_answer(context, query):
    """
    Production-Grade RAG Context Synthesizer.
    Parses definitions, components, and bullet items into a clean structured response.
    """
    if not context or not context.strip():
        return "No relevant information found in the document context."

    context_clean = clean_text_glitches(context)

    # Extract non-header lines
    lines = [line.strip() for line in context_clean.split("\n") if line.strip() and not line.startswith("[Source:")]

    # Find overview/definition sentences
    overviews = []
    bullets = []

    for line in lines:
        l_lower = line.lower()
        if any(kw in l_lower for kw in ["consists of", "typically include", "comprises", "is defined as"]):
            # Clean overview phrase
            clean_l = re.sub(r'^[•\-\*]\s*', '', line).strip()
            if len(clean_l) > 20:
                overviews.append(clean_l)

        # Detect bullet list items
        if line.startswith(('•', '-', '*')) or re.match(r'^[A-Z][a-z\s]+:', line):
            clean_b = re.sub(r'^[•\-\*]\s*', '', line).strip()
            if len(clean_b) > 15:
                bullets.append(clean_b)

    # Assemble response sections
    response_sections = []

    # 1. Overview Section
    if overviews:
        best_overview = overviews[0]
        response_sections.append(f"**Overview:**\n{best_overview}")
    else:
        # Fallback first meaningful sentence
        first_line = next((l for l in lines if len(l) > 30), None)
        if first_line:
            response_sections.append(f"**Overview:**\n{first_line}")

    # 2. Key Components / System Elements Section
    if bullets:
        formatted_bullets = []
        seen = set()
        for b in bullets[:8]:  # Top 8 components
            # Format bold component headers if colon present e.g. "Roof (catchment area): Details"
            if ":" in b and not b.startswith("http"):
                parts = b.split(":", 1)
                comp_name = parts[0].strip()
                comp_desc = parts[1].strip()
                if comp_name not in seen:
                    seen.add(comp_name)
                    formatted_bullets.append(f"- **{comp_name}**: {comp_desc}")
            else:
                if b[:40] not in seen:
                    seen.add(b[:40])
                    formatted_bullets.append(f"- {b}")

        if formatted_bullets:
            response_sections.append("**System Components & Details:**\n" + "\n".join(formatted_bullets))

    if not response_sections:
        response_sections.append(f"**Extracted Technical Summary:**\n" + "\n".join([f"- {l}" for l in lines[:4]]))

    return "\n\n".join(response_sections)


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