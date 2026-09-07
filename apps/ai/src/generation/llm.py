import json
import re
from collections.abc import Generator
from typing import Any

import ollama
from llama_index.llms.ollama import Ollama
from src.config import settings
from src.logger import logger


class LegalPromptTemplate:
    SYSTEM_PROMPT: str = (
        "You are 'Verdict AI', an expert, highly articulate AI Legal and Case Management Assistant "
        "for a modern law firm and enterprise legal operations platform.\n\n"
        "Core Capabilities:\n"
        "1. Case & Matter Intelligence: Analyze court appearances, limitation dates, filings, and case strategy.\n"
        "2. Legal Drafting: Draft formal legal notices, petitions, rejoinders, plaints, engagement letters, and commercial contracts.\n"
        "3. Legal Research & Precedents: Reference statutory provisions (e.g., Contract Act, CPC, CrPC, Companies Act) and case law citations (e.g., PLD, SCMR, CLD, AIR, Supreme Court precedents).\n"
        "4. Document Review & Analysis: When provided with attached documents or case excerpts, synthesize key clauses, identify risks, and extract essential terms.\n"
        "5. Firm Operations: Summarize tasks, associate utilization, court diary schedules, and billing disbursements.\n\n"
        "Guidelines for Response:\n"
        "- When document excerpts or attached documents are provided, base case-specific facts STRICTLY on them and cite the relevant source document/section.\n"
        "- When no case documents are attached, provide professional, authoritative legal analysis, drafting templates, and strategic guidance while clearly noting general legal principles.\n"
        "- Maintain a professional, objective, precise legal tone.\n"
        "- Use markdown formatting (headers, bold text, bullet points, blockquotes) for excellent readability."
    )

    @classmethod
    def format_context(
        cls,
        chunks: list[dict[str, Any]] | None = None,
        attachments: list[dict[str, Any]] | None = None,
    ) -> str:
        parts: list[str] = []

        if attachments:
            for i, att in enumerate(attachments, 1):
                name = att.get("name") or att.get("filename") or f"Attachment {i}"
                content = att.get("content") or att.get("text") or ""
                if content:
                    parts.append(
                        f"=== [ATTACHED DOCUMENT {i}: {name}] ===\n{content.strip()}"
                    )

        if chunks:
            for i, chunk in enumerate(chunks, 1):
                doc_name = chunk.get("document_name", "Case File")
                chunk_text = chunk.get("chunk_text", "").strip()
                page = chunk.get("page_number", i)
                parts.append(
                    f"--- [DATABASE EXCERPT {i}] Source: {doc_name} (Section/Page: {page}) ---\n{chunk_text}"
                )

        return "\n\n".join(parts) if parts else ""

    @classmethod
    def build_prompt(
        cls,
        query: str,
        chunks: list[dict[str, Any]] | None = None,
        attachments: list[dict[str, Any]] | None = None,
        matter_id: str | None = None,
    ) -> str:
        formatted_context = cls.format_context(chunks, attachments)
        prompt_parts: list[str] = []

        if matter_id:
            prompt_parts.append(f"Active Matter / Case ID: {matter_id}")

        if formatted_context:
            prompt_parts.append(f"Document Context & Attachments:\n{formatted_context}")

        prompt_parts.append(f"User Query:\n{query}")
        prompt_parts.append(
            "Please provide a thorough, structured, and professional response:"
        )

        return "\n\n".join(prompt_parts)


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
            self._client = ollama.Client(
                host=self.host,
                timeout=float(self.timeout),
            )
        return self._client

    def get_llama_llm(self) -> Ollama:
        if self._llm is None:
            self._llm = Ollama(
                model=self.model_name,
                base_url=self.host,
                temperature=self.temperature,
                request_timeout=float(self.timeout),
                additional_kwargs={
                    "num_predict": self.max_tokens,
                    "keep_alive": "30m",
                },
            )
        return self._llm


class ResponseGenerator:
    def __init__(self) -> None:
        self.llm_manager = LLMManager()

    def _extract_citations(
        self, text: str, chunks: list[dict[str, Any]] | None = None
    ) -> list[dict[str, Any]]:
        """Extract legal citations and document references from generated text."""
        citations: list[dict[str, Any]] = []
        seen = set()

        # Regex for common legal citations (PLD, SCMR, CLD, MLD, AIR, etc.)
        pattern = r"(PLD\s+\d{4}\s+[A-Za-z]+\s+\d+|\d{4}\s+(?:SCMR|CLD|MLD|CLC|PCrLJ|PTD)\s+\d+|Section\s+\d+(?:\s+of\s+[A-Za-z\s,]+Act)?[,\s\d]*)"
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            cleaned = match.strip()
            if cleaned.lower() not in seen and len(cleaned) > 4:
                seen.add(cleaned.lower())
                year_match = re.search(r"\b(18|19|20)\d{2}\b", cleaned)
                year = year_match.group(0) if year_match else None
                citations.append({
                    "title": cleaned,
                    "source": "Statutory Authority / Case Reporter",
                    "year": year,
                    "summary": f"Referenced authority in analysis: {cleaned}",
                })

        # Add document chunks if available
        if chunks:
            for chunk in chunks[:3]:
                doc_name = chunk.get("document_name", "Case Document")
                if doc_name and doc_name.lower() not in seen:
                    seen.add(doc_name.lower())
                    citations.append({
                        "title": doc_name,
                        "source": f"Case Record (Page {chunk.get('page_number', 1)})",
                        "summary": chunk.get("chunk_text", "")[:120] + "...",
                    })

        return citations

    def chat(
        self,
        message: str,
        history: list[dict[str, Any]] | None = None,
        context_chunks: list[dict[str, Any]] | None = None,
        attachments: list[dict[str, Any]] | None = None,
        matter_id: str | None = None,
    ) -> dict[str, Any]:
        """Multi-turn chat completion with document attachments and RAG context."""
        client = self.llm_manager.get_client()

        # Build message history for Ollama
        messages: list[dict[str, str]] = [
            {"role": "system", "content": LegalPromptTemplate.SYSTEM_PROMPT}
        ]

        if history:
            for item in history:
                role = item.get("role", "user")
                if role in ("user", "assistant"):
                    messages.append({
                        "role": role,
                        "content": item.get("content", ""),
                    })

        # Format current user turn with attachments and retrieved context
        user_prompt = LegalPromptTemplate.build_prompt(
            query=message,
            chunks=context_chunks,
            attachments=attachments,
            matter_id=matter_id,
        )
        messages.append({"role": "user", "content": user_prompt})

        try:
            logger.info(
                f"Calling Ollama chat ({self.llm_manager.model_name}) with {len(messages)} messages..."
            )
            response = client.chat(
                model=self.llm_manager.model_name,
                messages=messages,
                options={
                    "temperature": self.llm_manager.temperature,
                    "num_predict": self.llm_manager.max_tokens,
                },
                keep_alive="30m",
            )
            answer_text = response.get("message", {}).get("content", "").strip()
        except (
            ollama.ResponseError,
            ollama.RequestError,
            RuntimeError,
            OSError,
            ConnectionError,
        ) as e:
            logger.error(f"Ollama chat generation failed: {e}")
            answer_text = (
                f"Unable to complete AI response via local model ({self.llm_manager.model_name}). "
                f"Please ensure Ollama is active. Error: {e}"
            )

        sources: list[dict[str, Any]] = []
        if context_chunks:
            for chunk in context_chunks:
                sources.append({
                    "document_id": chunk.get("document_id", "doc"),
                    "document_name": chunk.get("document_name", "Document"),
                    "chunk_text": chunk.get("chunk_text", ""),
                    "similarity_score": chunk.get("similarity_score", 0.0),
                    "page_number": chunk.get("page_number", 1),
                })

        if attachments:
            for att in attachments:
                sources.append({
                    "document_id": att.get("id", "attachment"),
                    "document_name": att.get("name", "Attached File"),
                    "chunk_text": (att.get("content") or "")[:200],
                    "similarity_score": 1.0,
                    "page_number": 1,
                })

        citations = self._extract_citations(answer_text, context_chunks)
        confidence = 0.95 if (context_chunks or attachments) else 0.88

        return {
            "answer": answer_text,
            "citations": citations,
            "sources": sources,
            "confidence": confidence,
            "has_answer": bool(answer_text),
            "matter_id": matter_id,
        }

    def generate(
        self,
        query: str,
        context_chunks: list[dict[str, Any]],
        matter_id: str | None = None,
    ) -> dict[str, Any]:
        """Backward-compatible single query generator."""
        return self.chat(
            message=query,
            history=[],
            context_chunks=context_chunks,
            matter_id=matter_id,
        )

    def generate_stream(
        self,
        query: str,
        context_chunks: list[dict[str, Any]] | None = None,
        attachments: list[dict[str, Any]] | None = None,
        history: list[dict[str, Any]] | None = None,
        matter_id: str | None = None,
    ) -> Generator[str, None, None]:
        prompt = LegalPromptTemplate.build_prompt(
            query=query,
            chunks=context_chunks,
            attachments=attachments,
            matter_id=matter_id,
        )
        client = self.llm_manager.get_client()

        messages: list[dict[str, str]] = [
            {"role": "system", "content": LegalPromptTemplate.SYSTEM_PROMPT}
        ]
        if history:
            for item in history:
                role = item.get("role", "user")
                if role in ("user", "assistant"):
                    messages.append({
                        "role": role,
                        "content": item.get("content", ""),
                    })
        messages.append({"role": "user", "content": prompt})

        sources = []
        if context_chunks:
            sources.extend([
                {
                    "document_name": c.get("document_name"),
                    "similarity_score": c.get("similarity_score"),
                    "page_number": c.get("page_number"),
                }
                for c in context_chunks
            ])

        meta_event = json.dumps({
            "type": "sources",
            "sources": sources,
            "matter_id": matter_id,
        })
        yield f"data: {meta_event}\n\n"

        try:
            stream = client.chat(
                model=self.llm_manager.model_name,
                messages=messages,
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
