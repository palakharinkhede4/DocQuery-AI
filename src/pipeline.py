from src.retriever import retrieve
from src.generator import generate_answer


def run_pipeline(query):
    docs = retrieve(query)

    # Simply join retrieved chunks (NO broken filtering)
    context = "\n".join(docs)

    answer = generate_answer(context, query)
    return answer