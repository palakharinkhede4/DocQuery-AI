from fastapi import FastAPI
from pydantic import BaseModel
from src.pipeline import run_pipeline

app = FastAPI()


class QueryRequest(BaseModel):
    query: str


@app.get("/")
def home():
    return {"message": "RAG API running 🚀"}


@app.post("/ask")
def ask_question(req: QueryRequest):
    answer = run_pipeline(req.query)
    return {"answer": answer}