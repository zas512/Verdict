import json
from collections.abc import Generator
from typing import Any

import ollama
from llama_index.llms.ollama import Ollama
from src.config import settings
from src.logger import logger


class LegalPromptTemplate:
    SYSTEM_PROMPT: str = (
        "You are an expert AI Legal Assistant for a law firm case management system. "
        "Your task is to provide accurate, concise, and professional answers to legal questions "
        "based STRICTLY on the provided case document excerpts.\n\n"
        "Guidelines:\n"
        "1. Base your answer ONLY on the provided Context excerpts.\n"
        "2. If the context does not contain enough information to answer the question, clearly state: "
        "'Based on the provided documents, I could not find information regarding this query.'\n"
        "3. Cite the relevant document names and sections whenever making a factual statement.\n"
        "4. Do NOT hallucinate, assume, or invent legal clauses, terms, or dates.\n"
        "5. Maintain a professional, objective, and authoritative legal tone."
    )

    @classmethod
    def format_context(cls, chunks: list[dict[str, Any]]) -> str:
        if not chunks:
            return "No relevant document excerpts found."
        context_parts: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            doc_name = chunk.get("document_name", "Document")
            chunk_text = chunk.get("chunk_text", "").strip()
            page = chunk.get("page_number", i)
            context_parts.append(
                f"--- [EXCERPT {i}] Source: {doc_name} (Page/Section: {page}) ---\n{chunk_text}"
            )
        return "\n\n".join(context_parts)

    @classmethod
    def build_prompt(cls, query: str, chunks: list[dict[str, Any]]) -> str:
        formatted_context = cls.format_context(chunks)
        return (
            f"Context Excerpts:\n{formatted_context}\n\n"
            f"User Question: {query}\n\n"
            "Please provide a precise, grounded answer with citations to the document sources above:"
        )


class LLMManager:
    def __init__(self) -> None:
        self.model_name = settings.ollama_llm_model
        self.host = settings.ollama_host
        self.temperature = settings.ollama_temperature
        self.max_tokens = settings.ollama_max_tokens
        self.timeout = settings.ollama_timeout
        self._llm: Ollama | None = None
        self._client: ollama.Client | None = None

    def get_client(self) -> ollama.Client:
        if self._client is None:
            self._client = ollama.Client(host=self.host)
        return self._client

    def get_llama_llm(self) -> Ollama:
        if self._llm is None:
            self._llm = Ollama(
                model=self.model_name,
                base_url=self.host,
                temperature=self.temperature,
                request_timeout=float(self.timeout),
                additional_kwargs={"num_predict": self.max_tokens},
            )
        return self._llm


class ResponseGenerator:
    def __init__(self) -> None:
        self.llm_manager = LLMManager()

    def generate(
        self,
        query: str,
        context_chunks: list[dict[str, Any]],
        matter_id: str | None = None,
    ) -> dict[str, Any]:
        if not context_chunks:
            return {
                "answer": "No relevant documents found in the database for your query.",
                "sources": [],
                "confidence": 0.0,
                "has_answer": False,
                "matter_id": matter_id,
            }
        prompt = LegalPromptTemplate.build_prompt(query, context_chunks)
        client = self.llm_manager.get_client()
        try:
            logger.info(
                f"Generating LLM response via Ollama ({self.llm_manager.model_name})..."
            )
            response = client.chat(
                model=self.llm_manager.model_name,
                messages=[
                    {"role": "system", "content": LegalPromptTemplate.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                options={
                    "temperature": self.llm_manager.temperature,
                    "num_predict": self.llm_manager.max_tokens,
                },
            )
            answer_text = response.get("message", {}).get("content", "").strip()
        except (
            ollama.ResponseError,
            ollama.RequestError,
            RuntimeError,
            OSError,
            ConnectionError,
        ) as e:
            logger.error(f"Ollama generation failed: {e}")
            answer_text = (
                f"Error connecting to local LLM ({self.llm_manager.model_name}). "
                f"Ensure Ollama is running at {self.llm_manager.host}. Error: {e}"
            )
        sources: list[dict[str, Any]] = []
        for chunk in context_chunks:
            sources.append({
                "document_id": chunk.get("document_id", "doc"),
                "document_name": chunk.get("document_name", "Document"),
                "chunk_text": chunk.get("chunk_text", ""),
                "similarity_score": chunk.get("similarity_score", 0.0),
                "page_number": chunk.get("page_number", 1),
            })
        top_scores = [c.get("similarity_score", 0.0) for c in context_chunks[:3]]
        avg_confidence = (
            round(sum(top_scores) / len(top_scores), 2) if top_scores else 0.0
        )
        has_answer = not (
            "could not find information" in answer_text.lower()
            or "no relevant" in answer_text.lower()
            or "error connecting" in answer_text.lower()
        )
        return {
            "answer": answer_text,
            "sources": sources,
            "confidence": avg_confidence,
            "has_answer": has_answer,
            "matter_id": matter_id,
        }

    def generate_stream(
        self,
        query: str,
        context_chunks: list[dict[str, Any]],
        matter_id: str | None = None,
    ) -> Generator[str, None, None]:
        if not context_chunks:
            no_docs_msg = json.dumps({
                "type": "content",
                "delta": "No relevant documents found in the database for your query.",
            })
            yield f"data: {no_docs_msg}\n\n"
            yield "data: [DONE]\n\n"
            return
        prompt = LegalPromptTemplate.build_prompt(query, context_chunks)
        client = self.llm_manager.get_client()
        sources = [
            {
                "document_name": c.get("document_name"),
                "similarity_score": c.get("similarity_score"),
                "page_number": c.get("page_number"),
            }
            for c in context_chunks
        ]
        meta_event = json.dumps({
            "type": "sources",
            "sources": sources,
            "matter_id": matter_id,
        })
        yield f"data: {meta_event}\n\n"
        try:
            stream = client.chat(
                model=self.llm_manager.model_name,
                messages=[
                    {"role": "system", "content": LegalPromptTemplate.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                options={
                    "temperature": self.llm_manager.temperature,
                    "num_predict": self.llm_manager.max_tokens,
                },
                stream=True,
            )
            for chunk in stream:
                delta = chunk.get("message", {}).get("content", "")
                if delta:
                    event = json.dumps({"type": "content", "delta": delta})
                    yield f"data: {event}\n\n"
        except (
            ollama.ResponseError,
            ollama.RequestError,
            RuntimeError,
            OSError,
            ConnectionError,
        ) as e:
            logger.error(f"Ollama streaming failed: {e}")
            err_event = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {err_event}\n\n"
        yield "data: [DONE]\n\n"


llm_manager = LLMManager()
response_generator = ResponseGenerator()
