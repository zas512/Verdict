"""Tests for the ingestion module."""

from pathlib import Path

import pytest

from src.ingestion import chunk_documents, load_documents


def test_load_documents() -> None:
    """Test loading documents from a directory."""
    data_dir = Path("./data/raw")
    if not data_dir.exists():
        pytest.skip("Data directory doesn't exist")

    docs = load_documents(data_dir)
    assert len(docs) > 0
    assert "content" in docs[0]
    assert "metadata" in docs[0]


def test_chunk_documents() -> None:
    """Test chunking documents."""
    # Create a test document
    test_doc = {
        "content": "This is a test document. It has multiple sentences. We should chunk it properly.",
        "metadata": {"file_name": "test.txt"},
    }

    chunks = chunk_documents([test_doc], strategy="sentence")
    assert len(chunks) > 0
    assert chunks[0].text is not None
    assert "chunk_index" in chunks[0].metadata


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
