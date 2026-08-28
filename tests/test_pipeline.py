import unittest
from utils import chunk_documents
from src.parsers import parse_document
from src.vectorstore import FAISSVectorStore, get_vector_store, clear_session_store
from src.pipeline import run_pipeline
from src.ingest import ingest_file_objects
from src.advanced_rag import BM25Index, reciprocal_rank_fusion, CRAGGrader, SelfRAGVerifier, is_index_or_syllabus_chunk


class TestLocalRAGPipeline(unittest.TestCase):

    def test_parser_and_chunker(self):
        sample_txt = "Gradient Descent is an optimization algorithm used to minimize cost functions. " \
                     "Learning rate controls step size in parameter updates."
        blocks = parse_document("gradient.txt", sample_txt.encode("utf-8"))
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]["metadata"]["source"], "gradient.txt")

        chunks = chunk_documents(blocks, chunk_size=100, overlap=10)
        self.assertGreaterEqual(len(chunks), 1)
        self.assertIn("Gradient Descent", chunks[0]["text"])

    def test_bm25_index_and_search(self):
        docs = [
            {"text": "Reciprocal Rank Fusion merges multiple ranking list scores.", "metadata": {"source": "rrf.txt"}},
            {"text": "Convolutional Neural Networks excel at computer vision tasks.", "metadata": {"source": "cnn.txt"}},
            {"text": "Cross-Encoder models compute joint attention across query and passage.", "metadata": {"source": "cross_encoder.txt"}}
        ]
        bm25 = BM25Index()
        bm25.build_index(docs)

        results = bm25.search("Cross-Encoder attention", top_k=2)
        self.assertGreater(len(results), 0)
        top_idx, top_score = results[0]
        self.assertEqual(top_idx, 2)
        self.assertIn("Cross-Encoder", docs[top_idx]["text"])

    def test_syllabus_index_debiasing_and_exact_phrase_ranking(self):
        """
        Verify that a substantive lecture chunk (e.g. Page 42 on Private member functions)
        is ranked significantly higher than a syllabus or table of contents chunk.
        """
        docs = [
            {
                "text": "SYLLABUS: PCCS2207 Object Oriented Programming. Module II: Abstraction mechanism: Classes, private, public, constructors, destructors, member data, member functions, inline function, friend functions, static members.",
                "metadata": {"source": "oops_notes.pdf", "page": 3}
            },
            {
                "text": "CONTENTS: Lecture 01: Introduction Lecture 02: OOP Lecture 13: Class Lecture 14: Member Function Lecture 15: Nesting of Member function Lecture 16: Array with Class.",
                "metadata": {"source": "oops_notes.pdf", "page": 4}
            },
            {
                "text": "Private member functions: Although it is a normal practice to place all data items in private section and functions in public, some situations require functions to be hidden. A private member function can only be called by another function that is a member of its class. Even an object cannot invoke a private function using the dot operator.",
                "metadata": {"source": "oops_notes.pdf", "page": 42}
            }
        ]

        self.assertTrue(is_index_or_syllabus_chunk(docs[0]["text"]))
        self.assertTrue(is_index_or_syllabus_chunk(docs[1]["text"]))
        self.assertFalse(is_index_or_syllabus_chunk(docs[2]["text"]))

        bm25 = BM25Index()
        bm25.build_index(docs)
        results = bm25.search("what are Private member functions?", top_k=3)

        self.assertGreater(len(results), 0)
        top_idx, top_score = results[0]
        # The substantive content on page 42 must be rank #1!
        self.assertEqual(top_idx, 2)
        self.assertIn("Private member functions:", docs[top_idx]["text"])

    def test_reciprocal_rank_fusion(self):
        docs = [
            {"text": "Doc A: Exact keyword match and semantic match.", "metadata": {"source": "a.txt"}},
            {"text": "Doc B: Semantic only match.", "metadata": {"source": "b.txt"}},
            {"text": "Doc C: Unrelated document content.", "metadata": {"source": "c.txt"}}
        ]
        dense_ranks = [{"text": docs[1]["text"], "score": 0.9, "_doc_idx": 1}, {"text": docs[0]["text"], "score": 0.85, "_doc_idx": 0}]
        sparse_ranks = [(0, 5.2), (2, 1.1)]

        fused = reciprocal_rank_fusion(dense_ranks, sparse_ranks, docs, k=60, top_k=2)
        self.assertGreater(len(fused), 0)
        self.assertEqual(fused[0]["text"], docs[0]["text"])

    def test_crag_grading(self):
        docs = [
            {"text": "Polymorphism allows objects of different classes to respond to identical method calls.", "score": 0.8},
            {"text": "DATABASE MANAGEMENT SYSTEMS: SQL transactions ensure ACID properties.", "score": 0.7}
        ]
        graded, stats = CRAGGrader.grade_documents("What is polymorphism in OOP?", docs)
        self.assertGreater(len(graded), 0)
        self.assertEqual(graded[0]["crag_grade"], "RELEVANT")
        self.assertIn("Polymorphism", graded[0]["text"])

    def test_self_rag_verification(self):
        context = "A first flush diverter routes the initial contaminated roof runoff away from the main water tank."
        answer = "A first flush diverter is used to route initial contaminated rainwater runoff away from storage tanks."
        res = SelfRAGVerifier.verify_answer(answer, context, "What is a first flush diverter?")
        self.assertTrue(res["is_grounded"])
        self.assertGreaterEqual(res["grounding_score"], 0.5)

    def test_session_isolated_pipeline(self):
        test_session = "test_session_adv_rag_123"
        sample_doc = {
            "name": "neural_net.txt",
            "content": b"Neural Networks consist of layers of interconnected nodes or neurons. "
                       b"Backpropagation calculates gradients of loss relative to weights."
        }
        res = ingest_file_objects([sample_doc], session_id=test_session)
        self.assertEqual(res["status"], "success")
        self.assertGreaterEqual(res["total_chunks"], 1)

        vstore = get_vector_store(session_id=test_session)
        self.assertIsInstance(vstore, FAISSVectorStore)

        pipeline_res = run_pipeline("What is backpropagation?", top_k=2, session_id=test_session)
        self.assertIn("query", pipeline_res)
        self.assertIn("answer", pipeline_res)
        self.assertGreater(len(pipeline_res["sources"]), 0)
        self.assertIn("pipeline_trace", pipeline_res)

        # Clean up test session store
        clear_session_store(test_session)

    def test_corrupt_pdf_resilience(self):
        corrupt_pdf_bytes = (
            b"%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
            b"4 0 obj\n<< /Length 44 >>\nstream\n"
            b"00 250 444 500 444 5\x00\x00\x00\x00\x00(C++ Reference Manual for Data Structures) TJ\x00\x00\x00\x00\x00\n"
            b"endstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n"
            b"0000000056 00000 n \n0000000114 00000 n \n0000000213 00000 n \ntrailer\n"
            b"<< /Size 5 /Root 1 0 R >>\nstartxref\n320\n%%EOF"
        )
        blocks = parse_document("cpp_reference.pdf", corrupt_pdf_bytes)
        self.assertGreaterEqual(len(blocks), 1)
        self.assertEqual(blocks[0]["metadata"]["source"], "cpp_reference.pdf")
        self.assertIn("C++ Reference Manual", blocks[0]["text"])

    def test_generator_gemini_key_resolution(self):
        import os
        from src.generator import get_api_key
        os.environ["GEMINI_API_KEY"] = "test_gemini_key_123"
        self.assertEqual(get_api_key("GEMINI_API_KEY"), "test_gemini_key_123")
        del os.environ["GEMINI_API_KEY"]


if __name__ == "__main__":
    unittest.main()
