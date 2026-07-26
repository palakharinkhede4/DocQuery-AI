import os
import re
import sys
import requests
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


def generate_answer_gemini(context, query, api_key):
    """
    Generate a high-quality, beautifully structured Markdown response using Google Gemini API.
    """
    models_to_try = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ]

    system_instruction = (
        "You are an expert technical assistant. Synthesize a clean, direct, beautifully structured "
        "markdown answer to the user's question using ONLY the provided document context.\n"
        "Rules:\n"
        "- Explain technical concepts clearly using bold headers, code snippets, and bullet points where helpful.\n"
        "- Do NOT repeat raw metadata tags, page markers (like /H17040 or ■ 267), or raw context headers inside your answer body.\n"
        "- If the provided context does not contain enough information to answer the question, state: "
        "'Based on the provided documents, I could not find sufficient information to answer your question.'"
    )

    prompt = f"Context:\n{context}\n\nQuestion: {query}"

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": MAX_TOKENS
        }
    }

    headers = {"Content-Type": "application/json"}
    last_error = None

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=15)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        ans = parts[0]["text"].strip()
                        if ans:
                            return ans
            else:
                # Fallback payload without separate systemInstruction object for older endpoints
                fallback_payload = {
                    "contents": [
                        {
                            "parts": [{"text": f"{system_instruction}\n\n{prompt}"}]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": MAX_TOKENS
                    }
                }
                res_fb = requests.post(url, headers=headers, json=fallback_payload, timeout=15)
                if res_fb.status_code == 200:
                    data = res_fb.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            ans = parts[0]["text"].strip()
                            if ans:
                                return ans
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
    """Repair PDF OCR / kerning glitches, structural tags, and footnote superscripts."""
    if not text:
        return ""

    # Clean PDF structural header tags and page number glitches like '/H17040' or '■ 487'
    text = re.sub(r'/H\d+', '', text)
    text = re.sub(r'■\s*\d+', '', text)

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

    # Clean up footnote superscript markers like 'source.a' -> 'source.'
    text = re.sub(r'([a-z0-9])\.([a-d1-9])\b', r'\1.', text)
    return text


def prepare_context_units(context):
    """
    Normalizes context lines and reconstructs complete multi-line sentences & bullet points.
    Prevents sentences from breaking mid-phrase.
    """
    context_clean = clean_text_glitches(context)
    lines = [l.strip() for l in context_clean.split("\n") if l.strip() and not l.startswith("[Source:")]

    units = []
    current_unit = []

    for line in lines:
        is_new_block = bool(re.match(r'^[•\-\*\d+\.]', line)) or bool(re.match(r'^[A-Z][a-zA-Z\s\(\)]+:', line))
        if is_new_block:
            if current_unit:
                full_text = " ".join(current_unit).strip()
                if len(full_text) > 20:
                    units.append(full_text)
            current_unit = [re.sub(r'^[•\-\*]\s*', '', line).strip()]
        else:
            # Check if line continues previous sentence or is a new standalone sentence
            if current_unit:
                current_unit.append(line)
            else:
                if len(line) > 20:
                    units.append(line)

    if current_unit:
        full_text = " ".join(current_unit).strip()
        if len(full_text) > 20:
            units.append(full_text)

    # Further break long paragraph units into distinct complete sentences if needed
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
    Production-Grade RAG Context Synthesizer.
    Parses definitions, components, and bullet items into a clean structured response.
    """
    if not context or not context.strip():
        return "No relevant information found in the document context."

    units = prepare_context_units(context)
    if not units:
        return "No relevant text extracted from context."

    # Score candidates against query keywords
    query_lower = query.lower()
    query_keywords = set(re.findall(r'\w+', query_lower)) - {
        'what', 'is', 'a', 'an', 'the', 'does', 'do', 'of', 'in', 'and', 'to', 'for', 'are', 'were', 'which'
    }

    scored = []
    for unit in units:
        score = 0
        u_lower = unit.lower()

        # Word overlap score
        for kw in query_keywords:
            if len(kw) > 2 and kw in u_lower:
                score += 5

        # Strong boost for primary definitions when query asks "consists of" / "what is"
        if "consists of" in query_lower and "consists of" in u_lower:
            score += 20

        if any(w in u_lower for w in ['consists', 'made from', 'include', 'components', 'diverts', 'stores', 'allows', 'used to', 'cleaning', 'flushed']):
            score += 4

        if unit.startswith(('•', '-', '*')) or ":" in unit[:30]:
            score += 3

        scored.append((score, unit))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_units = [unit for score, unit in scored if score > 3]

    if not top_units:
        top_units = [unit for score, unit in scored[:3]]

    # Detect query type: component list vs definition / general QA
    is_list_query = any(k in query_lower for k in ['component', 'parts', 'elements', 'list', 'types'])

    if is_list_query:
        formatted_bullets = []
        seen = set()
        for u in top_units[:12]:
            clean_u = re.sub(r'^[•\-\*\d+\.]\s*', '', u).strip()
            if clean_u[:40] not in seen:
                seen.add(clean_u[:40])
                if ":" in clean_u and not clean_u.startswith("http"):
                    parts = clean_u.split(":", 1)
                    formatted_bullets.append(f"- **{parts[0].strip()}**: {parts[1].strip()}")
                else:
                    formatted_bullets.append(f"- {clean_u}")

        return "**Key Components & System Details:**\n\n" + "\n".join(formatted_bullets)

    # General / Definition QA: return top unbroken sentences
    unique_answers = []
    seen_txt = set()

    for item in top_units[:3]:
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
    1. Check for Gemini API key (GEMINI_API_KEY / GOOGLE_API_KEY) if set in Secrets/Env.
    2. Check for optional Groq API key if set in Secrets/Env.
    3. Fallback to Local HuggingFace LLM (on local desktop with ample RAM).
    4. Fallback to Production-Grade RAG Synthesizer (on Streamlit Cloud 1GB RAM container).
    """
    if not context or not context.strip():
        return "I don't know based on the provided documents. No relevant context was found."

    # 1. Primary High-Performance Model: Gemini API
    gemini_key = get_api_key("GEMINI_API_KEY")
    if gemini_key:
        try:
            return generate_answer_gemini(context, query, gemini_key)
        except Exception as e:
            print(f"Gemini API error ({e}). Falling back to secondary LLM pipelines.")

    # 2. Secondary Model: Groq API
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