import os
import re
import sys
import requests
from config import LLM_MODEL, MAX_TOKENS
from src.advanced_rag import SelfRAGVerifier


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
    target_names = [key_name, key_name.upper(), key_name.lower()]
    if key_name.upper() in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]:
        target_names.extend(["GEMINI_API_KEY", "gemini_api_key", "GOOGLE_API_KEY", "google_api_key"])

    # 1. Environment variables
    for name in target_names:
        val = os.getenv(name, "")
        if val:
            return val

    # 2. Streamlit secrets
    try:
        import streamlit as st
        for name in target_names:
            if name in st.secrets:
                val = st.secrets[name]
                if val:
                    return str(val)
    except Exception:
        pass

    # 3. .env file
    try:
        from dotenv import load_dotenv, find_dotenv
        load_dotenv(find_dotenv(), override=False)
        for name in target_names:
            val = os.getenv(name, "")
            if val:
                return val
    except Exception:
        pass

    return ""


SYSTEM_INSTRUCTION = (
    "You are a Principal Document Intelligence & Research AI assistant.\n"
    "Your goal is to formulate a high-accuracy, rigorous, complete, and beautifully organized technical answer to the user's question based strictly on the provided Context Passages.\n\n"
    "### Core Response Architecture:\n"
    "1. EXECUTIVE SUMMARY: Start with a clear, direct, and comprehensive 1-2 sentence definition or answer.\n"
    "2. DETAILED MECHANISM & PRINCIPLES: Provide a thorough, step-by-step technical explanation of the underlying mechanisms, processes, or theory found in the context.\n"
    "3. KEY COMPONENTS & CHARACTERISTICS: Use cleanly formatted bullet points, numbered workflows, or code snippets (if present) to break down specific components, parameters, and properties.\n"
    "4. IN-LINE SOURCE CITATIONS: Attribute key facts and specifications with in-line source tags, e.g. [Source: document.pdf (Page 2)].\n"
    "5. STRICT TOPIC FOCUS & NEGATIVE CONSTRAINT: Strictly answer ONLY what was asked. Never add separate sections for unrelated syllabus topics or adjacent headers that happen to appear in the same chunk.\n"
    "6. GROUNDING & HONESTY: Do NOT invent facts or extrapolate beyond what is documented. If the context does not contain enough information, state: 'Based on the provided documents, I could not find sufficient information to answer your question.'"
)


def generate_answer_gemini(context, query, api_key):
    """
    Generate a thorough, complete, beautifully structured Markdown response using Gemini API.
    """
    models_to_try = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash"
    ]

    prompt = f"Context Passages:\n{context}\n\nUser Question: {query}"

    payload = {
        "systemInstruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION}]
        },
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1000
        }
    }

    headers = {"Content-Type": "application/json"}
    last_error = None

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        ans = parts[0]["text"].strip()
                        if ans:
                            return ans, model
            else:
                # Fallback payload without separate systemInstruction object for older endpoints
                fallback_payload = {
                    "contents": [
                        {
                            "parts": [{"text": f"{SYSTEM_INSTRUCTION}\n\n{prompt}"}]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 1000
                    }
                }
                res_fb = requests.post(url, headers=headers, json=fallback_payload, timeout=20)
                if res_fb.status_code == 200:
                    data = res_fb.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            ans = parts[0]["text"].strip()
                            if ans:
                                return ans, model
                last_error = f"HTTP {res.status_code}: {res.text}"
        except Exception as e:
            last_error = str(e)

    raise RuntimeError(f"Gemini API error across models: {last_error}")


def generate_answer_groq(context, query, api_key):
    import groq
    client = groq.Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_INSTRUCTION
            },
            {
                "role": "user",
                "content": f"Context Passages:\n{context}\n\nQuestion: {query}"
            }
        ],
        max_tokens=800,
        temperature=0.2
    )
    return response.choices[0].message.content.strip(), "llama-3.1-8b-instant"


def clean_text_glitches(text):
    """Repair PDF OCR / kerning glitches, structural tags, and footnote superscripts."""
    if not text:
        return ""

    text = re.sub(r'/H\d+', '', text)
    text = re.sub(r'■\s*\d+', '', text)
    text = re.sub(r'P\.T\.O\s*\d*', '', text)

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

    text = re.sub(r'([a-z0-9])\.([a-d1-9])\b', r'\1.', text)
    return text


def prepare_context_units(context):
    """Normalizes context lines and reconstructs complete multi-line sentences & bullet points."""
    context_clean = clean_text_glitches(context)
    lines = [l.strip() for l in context_clean.split("\n") if l.strip() and not l.startswith("[Source:")]

    units = []
    current_unit = []

    for line in lines:
        is_new_block = bool(re.match(r'^[•\-\*\d+\.]', line)) or bool(re.match(r'^[A-Z\s]{3,25}:', line))
        if is_new_block:
            if current_unit:
                full_text = " ".join(current_unit).strip()
                if len(full_text) > 20:
                    units.append(full_text)
            current_unit = [re.sub(r'^[•\-\*]\s*', '', line).strip()]
        else:
            if current_unit:
                current_unit.append(line)
            else:
                if len(line) > 20:
                    units.append(line)

    if current_unit:
        full_text = " ".join(current_unit).strip()
        if len(full_text) > 20:
            units.append(full_text)

    final_sentences = []
    for u in units:
        if u.startswith(('•', '-', '*')) or ":" in u[:30]:
            final_sentences.append(u)
        else:
            sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', u)
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) > 20:
                    final_sentences.append(s_clean)

    return final_sentences


def synthesize_extractive_answer(context, query):
    """
    SOTA Structured Context Synthesizer with topic isolation and clean markdown formatting.
    """
    if not context or not context.strip():
        return "No relevant information found in the document context.", "Extractive Fallback"

    units = prepare_context_units(context)
    if not units:
        return "No relevant text extracted from context.", "Extractive Fallback"

    query_lower = query.lower()
    query_keywords = set(re.findall(r'\w+', query_lower)) - {
        'what', 'is', 'a', 'an', 'the', 'does', 'do', 'of', 'in', 'and', 'to', 'for', 'are', 'were', 'which', 'explain', 'describe'
    }

    scored = []
    for unit in units:
        score = 0
        u_lower = unit.lower()

        # Penalize unrelated uppercase topic headers
        header_match = re.match(r'^([A-Z\s]{3,25}):', unit.strip())
        if header_match:
            header_text = header_match.group(1).lower()
            if not any(kw in header_text for kw in query_keywords if len(kw) > 2):
                score -= 30

        for kw in query_keywords:
            if len(kw) > 2 and kw in u_lower:
                score += 8

        if any(w in u_lower for w in ['means', 'defined as', 'refers to', 'ability to', 'process by which', 'consists of', 'comprises']):
            score += 6

        if unit.startswith(('•', '-', '*')) or ":" in unit[:30]:
            score += 3

        scored.append((score, unit))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_units = [unit for score, unit in scored if score > 3]

    if not top_units:
        top_units = [unit for score, unit in scored[:3]]

    unique_answers = []
    seen_txt = set()

    for item in top_units[:4]:
        clean_item = re.sub(r'^[•\-\*\d+\.]\s*', '', item).strip()
        key = clean_item[:35]
        if key not in seen_txt:
            seen_txt.add(key)
            unique_answers.append(clean_item)

    if not unique_answers:
        return "Based on the provided documents, I could not find sufficient information to answer your question.", "Extractive Fallback"

    # Build structured response
    output_parts = [f"**Executive Summary:**\n{unique_answers[0]}"]
    if len(unique_answers) > 1:
        bullets = "\n".join([f"- {ans}" for ans in unique_answers[1:]])
        output_parts.append(f"**Key Points & Mechanisms:**\n{bullets}")

    return "\n\n".join(output_parts), "Offline Structured Synthesizer"


_local_tokenizer = None
_local_model = None


def get_local_llm():
    global _local_tokenizer, _local_model

    if is_cloud_environment():
        return None, None

    if _local_model is None:
        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM
            _local_tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL)
            _local_model = AutoModelForCausalLM.from_pretrained(
                LLM_MODEL,
                dtype=torch.float32
            )
            _local_model.to("cpu")
        except Exception as e:
            print(f"Warning: Could not load local LLM ({e}). Using extractive synthesis mode.")
            return None, None
    return _local_tokenizer, _local_model


def generate_answer(context, query, enable_self_rag=True):
    """
    Generate answer with full model hierarchy, structured prompting, and Self-RAG verification.
    """
    if not context or not context.strip():
        return {
            "answer": "I don't know based on the provided documents. No relevant context was found.",
            "model_used": "None",
            "self_rag": {"grounding_score": 0.0, "is_grounded": False, "verdict": "No Context"}
        }

    raw_answer = ""
    model_name = ""

    # 1. Primary: Gemini API
    gemini_key = get_api_key("GEMINI_API_KEY")
    if gemini_key:
        try:
            raw_answer, model_name = generate_answer_gemini(context, query, gemini_key)
        except Exception as e:
            print(f"Gemini API error ({e}). Falling back to secondary LLM pipelines.")

    # 2. Secondary: Groq API
    if not raw_answer:
        groq_key = get_api_key("GROQ_API_KEY")
        if groq_key:
            try:
                raw_answer, model_name = generate_answer_groq(context, query, groq_key)
            except Exception as e:
                print(f"Groq API error ({e}). Falling back to local/extractive pipeline.")

    # 3. Fallback: Local HuggingFace Model
    if not raw_answer:
        tokenizer, model = get_local_llm()
        if tokenizer is not None and model is not None:
            prompt = f"{SYSTEM_INSTRUCTION}\n\nContext Passages:\n{context}\n\nQuestion:\n{query}\n\nFinal Answer:\n"
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
                    raw_answer = decoded.split("Final Answer:")[-1].strip()
                else:
                    raw_answer = decoded.strip()
                model_name = f"Local ({LLM_MODEL})"
            except Exception:
                raw_answer = ""

    # 4. Fallback: Offline Structured Synthesizer
    if not raw_answer:
        raw_answer, model_name = synthesize_extractive_answer(context, query)

    # 5. Self-RAG Verification
    self_rag_meta = {}
    if enable_self_rag:
        self_rag_meta = SelfRAGVerifier.verify_answer(raw_answer, context, query)

    return {
        "answer": raw_answer,
        "model_used": model_name,
        "self_rag": self_rag_meta
    }