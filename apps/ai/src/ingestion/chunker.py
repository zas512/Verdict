import re
from dataclasses import dataclass, field
from typing import Any, ClassVar

from src.config import settings
from src.logger import logger


@dataclass
class Chunk:
    """Represents a single chunk of text with metadata."""

    text: str
    metadata: dict[str, Any] = field(default_factory=dict)
    chunk_id: str | None = None
    start_index: int | None = None
    end_index: int | None = None


class LegalChunker:
    SECTION_PATTERNS: ClassVar[list[str]] = [
        r"(?i)^(article|section|clause|paragraph)\s+\d+",
        r"(?i)^\d+\.\s+",
        r"(?i)^[A-Z][A-Z\s]+$",
        r"(?i)^(whereas|now therefore|in witness whereof)",
    ]

    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        separator: str | None = None,
    ) -> None:
        self.chunk_size = chunk_size or settings.chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap
        self.separator = separator or settings.chunk_separator

    def chunk_by_sentence(self, text: str, metadata: dict[str, Any]) -> list[Chunk]:
        sentences = self._split_sentences(text)
        chunks: list[Chunk] = []
        current_chunk: list[str] = []
        current_length = 0
        for sentence in sentences:
            sentence_len = len(sentence)
            if current_length + sentence_len > self.chunk_size and current_chunk:
                chunk_text = self.separator.join(current_chunk)
                chunks.append(
                    Chunk(
                        text=chunk_text,
                        metadata=metadata.copy(),
                    )
                )
                overlap_text = (
                    self.separator.join(current_chunk[-2:])
                    if len(current_chunk) > 2
                    else self.separator.join(current_chunk)
                )
                current_chunk = [overlap_text] if overlap_text else []
                current_length = len(overlap_text) if overlap_text else 0
            current_chunk.append(sentence)
            current_length += sentence_len + 1
        if current_chunk:
            chunk_text = self.separator.join(current_chunk)
            chunks.append(
                Chunk(
                    text=chunk_text,
                    metadata=metadata.copy(),
                )
            )
        return chunks

    def chunk_by_fixed_size(self, text: str, metadata: dict[str, Any]) -> list[Chunk]:
        chunks: list[Chunk] = []
        start = 0
        text = " ".join(text.split())
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            if end < len(text):
                for separator in [". ", "! ", "? ", "\n\n", "\n"]:
                    last_sep = text.rfind(separator, start, end)
                    if last_sep != -1:
                        end = last_sep + len(separator)
                        break
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(
                    Chunk(
                        text=chunk_text,
                        metadata=metadata.copy(),
                        start_index=start,
                        end_index=end,
                    )
                )
            start = end - self.chunk_overlap if self.chunk_overlap > 0 else end
        return chunks

    def chunk_by_semantic_paragraph(
        self, text: str, metadata: dict[str, Any]
    ) -> list[Chunk]:
        paragraphs = re.split(r"\n\s*\n", text)
        chunks: list[Chunk] = []
        current_chunk: list[str] = []
        current_length = 0
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            para_len = len(para)
            is_heading = any(
                re.search(pattern, para, re.IGNORECASE) is not None
                for pattern in self.SECTION_PATTERNS
            )
            if (
                is_heading or current_length + para_len > self.chunk_size
            ) and current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                chunks.append(
                    Chunk(
                        text=chunk_text,
                        metadata=metadata.copy(),
                    )
                )
                current_chunk = []
                current_length = 0
            current_chunk.append(para)
            current_length += para_len + 2
        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append(
                Chunk(
                    text=chunk_text,
                    metadata=metadata.copy(),
                )
            )
        return chunks

    def chunk_document(
        self,
        document: dict[str, Any],
        strategy: str = "sentence",
    ) -> list[Chunk]:
        """
        Chunk a document using the specified strategy.
        Args:
            document: Document dict with 'content' and 'metadata'
            strategy: 'sentence', 'fixed', 'semantic', 'legal'
        Returns:
            list of Chunk objects
        """
        text = document["content"]
        metadata = document["metadata"].copy()
        logger.debug(
            f"Chunking document with {strategy} strategy: {metadata.get('file_name', 'unknown')}"
        )
        strategies: dict[str, Any] = {
            "sentence": self.chunk_by_sentence,
            "fixed": self.chunk_by_fixed_size,
            "semantic": self.chunk_by_semantic_paragraph,
            "legal": self.chunk_by_semantic_paragraph,  # Alias
        }
        chunker_func = strategies.get(strategy, self.chunk_by_sentence)
        chunks = chunker_func(text, metadata)
        for i, chunk in enumerate(chunks):
            chunk.chunk_id = f"{metadata.get('file_name', 'doc')}_{i + 1}"
            chunk.metadata["chunk_index"] = i
            chunk.metadata["total_chunks"] = len(chunks)
            chunk.metadata["strategy"] = strategy
        logger.info(
            f"Created {len(chunks)} chunks from {metadata.get('file_name', 'unknown')}"
        )
        return chunks

    def _split_sentences(self, text: str) -> list[str]:
        text = re.sub(r"(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|etc)\.", r"\1<ABBR>", text)
        sentences = re.split(r"(?<=[.!?])\s+", text)
        sentences = [s.replace("<ABBR>", ".") for s in sentences]
        return [s.strip() for s in sentences if s.strip()]


def chunk_documents(
    documents: list[dict[str, Any]],
    strategy: str = "sentence",
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    chunker = LegalChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    all_chunks: list[Chunk] = []
    for doc in documents:
        chunks = chunker.chunk_document(doc, strategy)
        all_chunks.extend(chunks)
    logger.info(f"Total chunks created: {len(all_chunks)}")
    return all_chunks
