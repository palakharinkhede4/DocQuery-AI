import unittest
from utils import chunk_documents
from src.parsers import parse_document
from src.vectorstore import FAISSVectorStore, get_vector_store, clear_session_store
from src.pipeline import run_pipeline
from src.ingest import ingest_file_objects


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

    def test_session_isolated_pipeline(self):
        test_session = "test_session_123"
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


if __name__ == "__main__":
    unittest.main()
