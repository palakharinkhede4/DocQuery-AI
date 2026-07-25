from config import LLM_MODEL, MAX_TOKENS

_local_tokenizer = None
_local_model = None


def get_local_llm():
    global _local_tokenizer, _local_model
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
            print(f"Warning: Could not load local LLM ({e}). Operating in extractive synthesis mode.")
            return None, None
    return _local_tokenizer, _local_model


def generate_answer(context, query):
    """
    Generate answer using local HuggingFace LLM model exclusively.
    """
    if not context or not context.strip():
        return "I don't know based on the provided documents. No relevant context was found."

    tokenizer, model = get_local_llm()

    if tokenizer is None or model is None:
        return f"Based on retrieved document context:\n\n{context}"

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
        return f"Based on retrieved document context:\n\n{context}"