import os
from dotenv import load_dotenv

load_dotenv()

# Absolute base directory of the project
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Embedding & LLM Configurations (FAISS Vector Store & Gemini 3.5 Flash Lite)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-3.5-flash-lite")

# Chunking & Retrieval Parameters (Increased chunk size to 1200 for lists & general documents)
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1200))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))
TOP_K = int(os.getenv("TOP_K", 4))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 1000))

# Advanced RAG Configurations
USE_HYBRID_SEARCH = os.getenv("USE_HYBRID_SEARCH", "1") == "1"
USE_RERANKING = os.getenv("USE_RERANKING", "1") == "1"
USE_HYDE = os.getenv("USE_HYDE", "1") == "1"
USE_CRAG = os.getenv("USE_CRAG", "1") == "1"
USE_SELF_RAG = os.getenv("USE_SELF_RAG", "1") == "1"
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
RRF_K = int(os.getenv("RRF_K", 60))

# Absolute Paths
DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data", "docs"))
VECTORSTORE_DIR = os.getenv("VECTORSTORE_DIR", os.path.join(BASE_DIR, "vectorstore", "faiss_index"))