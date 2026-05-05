from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from config import LLM_MODEL, MAX_TOKENS

tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL)
model = AutoModelForCausalLM.from_pretrained(
    LLM_MODEL,
    torch_dtype=torch.float32
)

device = "cpu"
model.to(device)


def generate_answer(context, query):
    prompt = f"""
You are a technical assistant.

ONLY answer if the context contains the answer.

Rules:
- Do NOT repeat the context
- Do NOT hallucinate
- If answer is missing, say: "I don't know based on the document."

Context:
{context}

Question:
{query}

Final Answer:
"""

    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=MAX_TOKENS,
        temperature=0.5,
        do_sample=True
    )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # 🔥 Extract clean answer
    if "Final Answer:" in decoded:
        answer = decoded.split("Final Answer:")[-1].strip()
    else:
        answer = decoded.strip()

    return answer