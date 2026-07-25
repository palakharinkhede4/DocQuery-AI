import os
import sys

# Ensure root directory is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from src.ingest import ingest_directory
from src.pipeline import run_pipeline
from src.vectorstore import clear_session_store

def run_sandbox_tests():
    sandbox_session = "sandbox_test_session"
    print("=" * 60)
    print("[Sandbox] STARTING INTERACTIVE SANDBOX BENCHMARK TEST")
    print("=" * 60)

    # 1. Ingest test dataset into sandbox session
    ingest_res = ingest_directory(session_id=sandbox_session)
    print(f"[Sandbox] Ingest Result: {ingest_res}\n")

    # 2. Benchmark Queries
    test_queries = [
        "A rainwater collection system consists of?",
        "What are the main components of a rainwater collection system?",
        "What is a first flush system and why is it used?",
        "What materials are commonly used for water storage tanks?",
        "What additional considerations are needed after constructing a new rainwater collection system?"
    ]

    for idx, query in enumerate(test_queries, 1):
        print("\n" + "-" * 50)
        print(f"[Query #{idx}]: '{query}'")
        print("-" * 50)

        res = run_pipeline(query, top_k=4, session_id=sandbox_session)

        print("\n[GENERATED ANSWER]:")
        print(res.get("answer"))

        print("\n[TOP RETRIEVED SOURCES]:")
        for src in res.get("sources", []):
            print(f"  - [{src['source']} Page {src['page']}] Score: {src['score']}")
            print(f"    Snippet: {src['snippet'][:120]}...")

    # Cleanup sandbox session
    clear_session_store(sandbox_session)
    print("\n" + "=" * 60)
    print("[Sandbox] SANDBOX BENCHMARK COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run_sandbox_tests()
