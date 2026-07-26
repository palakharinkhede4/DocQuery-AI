import os
from dotenv import load_dotenv

load_dotenv()

# Absolute base directory of the project
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Embedding & LLM Configurations (FAISS Vector Store & Gemini LLM)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
LLM_MODEL = os.getenv("LLM_MODEL", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")

# Chunking & Retrieval Parameters (Increased chunk size to 1200 for technical lists & documents)
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1200))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))
TOP_K = int(os.getenv("TOP_K", 4))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 800))

# Absolute Paths
DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data", "docs"))
VECTORSTORE_DIR = os.getenv("VECTORSTORE_DIR", os.path.join(BASE_DIR, "vectorstore", "faiss_index"))