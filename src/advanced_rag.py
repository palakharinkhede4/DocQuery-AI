import math
import re
from typing import List, Dict, Any, Optional, Tuple
from config import RERANKER_MODEL, RRF_K

# Common Stopwords for Technical NLP
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "did", "do", "does", "doing", "down", "during", "each", "explain", "describe",
    "few", "for", "from", "further", "had", "has", "have", "having", "he", "her",
    "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in",
    "into", "is", "it", "its", "itself", "let's", "me", "more", "most", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "she", "should", "so", "some", "such", "than", "that", "the", "their",
    "theirs", "them", "themselves", "then", "there", "these", "they", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "were", "weren't", "what", "when", "where", "which", "while",
    "who", "whom", "why", "with", "won't", "would", "you", "your", "yours",
    "yourself", "yourselves"
}


def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into clean lowercase terms."""
    if not text:
        return []
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
    return [w for w in cleaned.split() if len(w) > 1]


class BM25Index:
    """
    High-Performance In-Memory BM25 Okapi Index for Sparse Keyword Retrieval.
    Implements Lucene-style IDF and length-normalized term frequency scoring.
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_len: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_freqs: Dict[str, int] = {}
        self.term_freqs: List[Dict[str, int]] = []
        self.total_docs: int = 0
        self.documents: List[Dict[str, Any]] = []

    def build_index(self, documents: List[Dict[str, Any]]):
        """Index a list of chunk records with text and metadata."""
        self.documents = documents
        self.total_docs = len(documents)
        self.doc_len = []
        self.term_freqs = []
        self.doc_freqs = {}

        if self.total_docs == 0:
            self.avg_doc_len = 0.0
            return

        total_tokens = 0
        for doc in documents:
            text = doc.get("text", "") if isinstance(doc, dict) else str(doc)
            tokens = tokenize(text)
            self.doc_len.append(len(tokens))
            total_tokens += len(tokens)

            tf: Dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            self.term_freqs.append(tf)

            for unique_t in tf.keys():
                self.doc_freqs[unique_t] = self.doc_freqs.get(unique_t, 0) + 1

        self.avg_doc_len = total_tokens / max(self.total_docs, 1)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[int, float]]:
        """Search BM25 index and return (doc_index, score) pairs."""
        if self.total_docs == 0 or not query.strip():
            return []

        tokens = tokenize(query)
        keywords = [t for t in tokens if t not in STOPWORDS]
        effective_keywords = keywords if keywords else tokens

        scores = [0.0] * self.total_docs

        for word in effective_keywords:
            df = self.doc_freqs.get(word, 0)
            if df == 0:
                continue

            # Standard BM25 Okapi IDF
            idf = math.log(1.0 + (self.total_docs - df + 0.5) / (df + 0.5))

            for idx in range(self.total_docs):
                tf = self.term_freqs[idx].get(word, 0)
                if tf > 0:
                    d_len = self.doc_len[idx]
                    denom = tf + self.k1 * (1.0 - self.b + self.b * (d_len / max(self.avg_doc_len, 1.0)))
                    scores[idx] += idf * ((tf * (self.k1 + 1.0)) / denom)

        # Exact phrase bonus
        query_clean = " ".join(effective_keywords)
        if len(query_clean) > 4:
            for idx, doc in enumerate(self.documents):
                doc_text = doc.get("text", "") if isinstance(doc, dict) else str(doc)
                if query_clean in doc_text.lower():
                    scores[idx] += 3.0

        # Sort by score descending
        ranked = [(idx, score) for idx, score in enumerate(scores) if score > 0]
        ranked.sort(key=lambda x: x[1], reverse=True)
        return ranked[:top_k]


def reciprocal_rank_fusion(
    dense_results: List[Dict[str, Any]],
    sparse_results: List[Tuple[int, float]],
    all_documents: List[Dict[str, Any]],
    k: int = RRF_K,
    top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Reciprocal Rank Fusion (RRF):
    Combines dense and sparse ranking sets by score = sum(1 / (k + rank)).
    """
    rrf_scores: Dict[int, float] = {}
    dense_rank_map: Dict[int, int] = {}
    sparse_rank_map: Dict[int, int] = {}
    doc_lookup: Dict[int, Dict[str, Any]] = {}

    # 1. Map Dense Ranks
    for rank, item in enumerate(dense_results):
        doc_idx = item.get("_doc_idx")
        if doc_idx is None:
            # Match by text
            for i, doc in enumerate(all_documents):
                if doc.get("text") == item.get("text"):
                    doc_idx = i
                    break
        if doc_idx is not None:
            dense_rank_map[doc_idx] = rank + 1
            doc_lookup[doc_idx] = item
            rrf_scores[doc_idx] = rrf_scores.get(doc_idx, 0.0) + (1.0 / (k + rank + 1))

    # 2. Map Sparse (BM25) Ranks
    for rank, (doc_idx, bm25_score) in enumerate(sparse_results):
        if 0 <= doc_idx < len(all_documents):
            sparse_rank_map[doc_idx] = rank + 1
            if doc_idx not in doc_lookup:
                doc_lookup[doc_idx] = all_documents[doc_idx]
            rrf_scores[doc_idx] = rrf_scores.get(doc_idx, 0.0) + (1.0 / (k + rank + 1))

    # Sort fused results by RRF score descending
    sorted_indices = sorted(rrf_scores.keys(), key=lambda idx: rrf_scores[idx], reverse=True)

    fused_results = []
    for idx in sorted_indices[:top_k]:
        raw_doc = doc_lookup[idx]
        text = raw_doc.get("text", "")
        meta = raw_doc.get("metadata", {})

        fused_results.append({
            "text": text,
            "metadata": meta,
            "score": round(rrf_scores[idx], 5),
            "dense_rank": dense_rank_map.get(idx, -1),
            "sparse_rank": sparse_rank_map.get(idx, -1),
            "rrf_score": round(rrf_scores[idx], 5),
            "_doc_idx": idx
        })

    return fused_results


# Lazy Cross-Encoder instance
_cross_encoder = None


def get_cross_encoder():
    """Lazy load Cross-Encoder reranker."""
    global _cross_encoder
    if _cross_encoder is None:
        try:
            from sentence_transformers import CrossEncoder
            _cross_encoder = CrossEncoder(RERANKER_MODEL)
        except Exception as e:
            print(f"[Reranker] Cross-Encoder could not be loaded ({e}). Using lexical cross-scorer.")
            _cross_encoder = False
    return _cross_encoder if _cross_encoder is not False else None


def rerank_passages(
    query: str,
    passages: List[Dict[str, Any]],
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    Cross-Encoder Reranking:
    Re-scores candidate passages using joint query-document cross-attention.
    """
    if not passages or not query.strip():
        return []

    cross_enc = get_cross_encoder()

    if cross_enc is not None:
        try:
            pairs = [(query, p.get("text", "")) for p in passages]
            scores = cross_enc.predict(pairs)

            for i, p in enumerate(passages):
                raw_s = float(scores[i])
                prob_s = 1.0 / (1.0 + math.exp(-raw_s)) if raw_s < 40 else 1.0
                p["rerank_score"] = round(prob_s, 4)
                p["original_score"] = p.get("score", 0.0)

            # Sort by rerank score descending
            passages.sort(key=lambda x: x.get("rerank_score", 0.0), reverse=True)
            return passages[:top_k]
        except Exception as e:
            print(f"[Reranker] Cross-encoder inference failed ({e}). Fallback to rank ordering.")

    # Fallback: Term overlap + density cross-scoring
    query_tokens = set(tokenize(query)) - STOPWORDS
    for p in passages:
        text = p.get("text", "").lower()
        score = 0.0
        for t in query_tokens:
            if t in text:
                score += text.count(t) * 1.5
        p["rerank_score"] = round(min(score / (score + 5.0), 0.99) if score > 0 else 0.1, 4)

    passages.sort(key=lambda x: x.get("rerank_score", 0.0), reverse=True)
    return passages[:top_k]


def generate_hyde_passage(query: str, api_key: Optional[str] = None) -> str:
    """
    Hypothetical Document Embeddings (HyDE):
    Generates a concise hypothetical document snippet to capture answer-space semantic manifold.
    """
    if not query or not query.strip():
        return query

    # If Gemini API key is available, generate high-quality hypothetical passage
    if api_key:
        try:
            import requests
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            prompt = (
                f"Write a concise, factual 2-sentence technical paragraph answering the question: '{query}'. "
                "Include core terminology and definitions as if extracted from an engineering document."
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 150}
            }
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=5)
            if res.status_code == 200:
                data = res.json()
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                if text:
                    return f"{query} {text}"
        except Exception:
            pass

    # Heuristic HyDE expansion: extract key entities and formulate semantic intent
    tokens = [t for t in tokenize(query) if t not in STOPWORDS]
    return f"{query} technical description definition and mechanism for {' '.join(tokens)}"


class CRAGGrader:
    """
    Corrective RAG (CRAG) Document Relevance Grader:
    Evaluates retrieved chunks, tags them as RELEVANT, PARTIALLY_RELEVANT, or IRRELEVANT,
    and filters out noisy background syllabus or mismatched sections.
    """
    @staticmethod
    def grade_documents(
        query: str,
        documents: List[Dict[str, Any]],
        min_relevance: float = 0.20
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        if not documents:
            return [], {"total": 0, "relevant": 0, "filtered": 0, "confidence": 0.0}

        query_tokens = set(tokenize(query)) - STOPWORDS
        if not query_tokens:
            query_tokens = set(tokenize(query))

        graded_docs = []
        relevant_count = 0
        total_score = 0.0

        for doc in documents:
            text = doc.get("text", "")
            meta = doc.get("metadata", {})
            t_lower = text.lower()

            # 1. Keyword coverage ratio
            matched_keywords = [t for t in query_tokens if t in t_lower]
            keyword_ratio = len(matched_keywords) / max(len(query_tokens), 1)

            # 2. Structural penalty for unrelated uppercase headers
            penalty = 0.0
            header_match = re.match(r'^([A-Z\s]{3,25}):', text.strip())
            if header_match:
                hdr = header_match.group(1).lower()
                if not any(k in hdr for k in query_tokens if len(k) > 2):
                    penalty = 0.25

            # 3. Base similarity / rerank score
            base_score = doc.get("rerank_score", doc.get("score", 0.5))
            final_grade_score = max(0.0, (0.5 * base_score) + (0.5 * keyword_ratio) - penalty)

            if final_grade_score >= 0.45:
                grade = "RELEVANT"
                relevant_count += 1
            elif final_grade_score >= min_relevance:
                grade = "PARTIALLY_RELEVANT"
                relevant_count += 1
            else:
                grade = "IRRELEVANT"

            doc_copy = doc.copy()
            doc_copy["crag_grade"] = grade
            doc_copy["crag_score"] = round(final_grade_score, 3)
            doc_copy["matched_keywords"] = matched_keywords
            total_score += final_grade_score

            if grade != "IRRELEVANT":
                graded_docs.append(doc_copy)

        avg_confidence = round(total_score / max(len(documents), 1), 3)

        # Fallback: if all chunks got filtered out, keep top 1 with warning tag
        if not graded_docs and documents:
            fallback = documents[0].copy()
            fallback["crag_grade"] = "PARTIALLY_RELEVANT"
            fallback["crag_score"] = 0.25
            graded_docs.append(fallback)

        stats = {
            "total_retrieved": len(documents),
            "relevant_count": relevant_count,
            "filtered_count": len(documents) - len(graded_docs),
            "retrieval_confidence": avg_confidence
        }

        return graded_docs, stats


class SelfRAGVerifier:
    """
    Self-RAG Grounding & Faithfulness Verifier:
    Validates that the generated answer is strictly grounded in the cited source context.
    """
    @staticmethod
    def verify_answer(answer: str, context: str, query: str) -> Dict[str, Any]:
        if not answer or not context:
            return {"grounding_score": 0.0, "is_grounded": False, "verdict": "Unverified"}

        ans_tokens = set(tokenize(answer)) - STOPWORDS
        ctx_tokens = set(tokenize(context))

        if not ans_tokens:
            return {"grounding_score": 1.0, "is_grounded": True, "verdict": "Grounded"}

        overlap = ans_tokens.intersection(ctx_tokens)
        grounding_score = round(len(overlap) / max(len(ans_tokens), 1), 3)

        is_grounded = grounding_score >= 0.50
        verdict = "Fully Grounded" if grounding_score >= 0.70 else ("Partially Grounded" if is_grounded else "Low Grounding Risk")

        return {
            "grounding_score": grounding_score,
            "is_grounded": is_grounded,
            "verdict": verdict,
            "supported_terms_count": len(overlap)
        }
