"""Chunking strategies for splitting documents into manageable pieces."""

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
    """
    Chunk legal documents with strategies optimized for legal text.
    """

    # Legal-specific patterns for better chunking
    SECTION_PATTERNS: ClassVar[list[str]] = [
        r"(?i)^(article|section|clause|paragraph)\s+\d+",  # Article 1, Section 2
        r"(?i)^\d+\.\s+",  # Numbered lists: 1. Text
        r"(?i)^[A-Z][A-Z\s]+$",  # ALL CAPS HEADINGS
        r"(?i)^(whereas|now therefore|in witness whereof)",  # Legal phrases
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
        """Chunk by sentences with overlap."""
        sentences = self._split_sentences(text)
        chunks: list[Chunk] = []
        current_chunk: list[str] = []
        current_length = 0

        for sentence in sentences:
            sentence_len = len(sentence)

            # If adding this sentence exceeds chunk size, finalize current chunk
            if current_length + sentence_len > self.chunk_size and current_chunk:
                chunk_text = self.separator.join(current_chunk)
                chunks.append(
                    Chunk(
                        text=chunk_text,
                        metadata=metadata.copy(),
                    )
                )

                # Keep overlap
                overlap_text = (
                    self.separator.join(current_chunk[-2:])
                    if len(current_chunk) > 2
                    else self.separator.join(current_chunk)
                )
                current_chunk = [overlap_text] if overlap_text else []
                current_length = len(overlap_text) if overlap_text else 0

            current_chunk.append(sentence)
            current_length += sentence_len + 1  # +1 for separator

        # Add final chunk
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
        """Chunk by fixed character size with overlap."""
        chunks: list[Chunk] = []
        start = 0

        # Remove extra whitespace
        text = " ".join(text.split())

        while start < len(text):
            end = min(start + self.chunk_size, len(text))

            # Try to end at a sentence boundary
            if end < len(text):
                # Look for sentence ending punctuation
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

            # Move start with overlap
            start = end - self.chunk_overlap if self.chunk_overlap > 0 else end

        return chunks

    def chunk_by_semantic_paragraph(
        self, text: str, metadata: dict[str, Any]
    ) -> list[Chunk]:
        """Chunk by paragraphs, keeping legal structure intact."""
        # Split by double newlines (paragraphs)
        paragraphs = re.split(r"\n\s*\n", text)
        chunks: list[Chunk] = []
        current_chunk: list[str] = []
        current_length = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            para_len = len(para)

            # Check if this paragraph is a legal heading
            is_heading = any(
                re.search(pattern, para, re.IGNORECASE) is not None
                for pattern in self.SECTION_PATTERNS
            )

            # If heading or adding paragraph exceeds size, finalize chunk
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
            current_length += para_len + 2  # +2 for newlines

        # Add final chunk
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
            f"🔪 Chunking document with {strategy} strategy: {metadata.get('file_name', 'unknown')}"
        )

        strategies: dict[str, Any] = {
            "sentence": self.chunk_by_sentence,
            "fixed": self.chunk_by_fixed_size,
            "semantic": self.chunk_by_semantic_paragraph,
            "legal": self.chunk_by_semantic_paragraph,  # Alias
        }

        chunker_func = strategies.get(strategy, self.chunk_by_sentence)
        chunks = chunker_func(text, metadata)

        # Add chunk IDs and indices
        for i, chunk in enumerate(chunks):
            chunk.chunk_id = f"{metadata.get('file_name', 'doc')}_{i + 1}"
            chunk.metadata["chunk_index"] = i
            chunk.metadata["total_chunks"] = len(chunks)
            chunk.metadata["strategy"] = strategy

        logger.info(
            f"✅ Created {len(chunks)} chunks from {metadata.get('file_name', 'unknown')}"
        )
        return chunks

    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences while handling abbreviations."""
        # Simple sentence splitting (can be improved with spaCy)
        # Handles common abbreviations like Mr. Dr. etc.
        text = re.sub(r"(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|etc)\.", r"\1<ABBR>", text)
        sentences = re.split(r"(?<=[.!?])\s+", text)
        # Restore abbreviations
        sentences = [re.sub(r"<ABBR>", ".", s) for s in sentences]
        return [s.strip() for s in sentences if s.strip()]


# Convenience function
def chunk_documents(
    documents: list[dict[str, Any]],
    strategy: str = "sentence",
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    """Chunk a list of documents."""
    chunker = LegalChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    all_chunks: list[Chunk] = []

    for doc in documents:
        chunks = chunker.chunk_document(doc, strategy)
        all_chunks.extend(chunks)

    logger.info(f"📊 Total chunks created: {len(all_chunks)}")
    return all_chunks
