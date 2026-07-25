import unittest
from utils import chunk_documents
from src.parsers import parse_document
from src.vectorstore import FAISSVectorStore, get_vector_store
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

    def test_faiss_vectorstore_and_pipeline(self):
        sample_doc = {
            "name": "neural_net.txt",
            "content": b"Neural Networks consist of layers of interconnected nodes or neurons. "
                       b"Backpropagation calculates gradients of loss relative to weights."
        }
        res = ingest_file_objects([sample_doc])
        self.assertEqual(res["status"], "success")
        self.assertGreaterEqual(res["total_chunks"], 1)

        vstore = get_vector_store()
        self.assertIsInstance(vstore, FAISSVectorStore)

        pipeline_res = run_pipeline("What is backpropagation?", top_k=2)
        self.assertIn("query", pipeline_res)
        self.assertIn("answer", pipeline_res)
        self.assertGreater(len(pipeline_res["sources"]), 0)


if __name__ == "__main__":
    unittest.main()
