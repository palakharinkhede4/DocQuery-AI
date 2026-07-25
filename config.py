import os
from dotenv import load_dotenv

load_dotenv()

# Embedding & Local LLM Configurations (100% Local & Offline)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
LLM_MODEL = os.getenv("LLM_MODEL", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")

# Chunking & Retrieval Parameters
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 400))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
TOP_K = int(os.getenv("TOP_K", 4))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 250))

# Paths
DATA_DIR = os.getenv("DATA_DIR", "data/docs")
VECTORSTORE_DIR = os.getenv("VECTORSTORE_DIR", "vectorstore/faiss_index")