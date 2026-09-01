from pathlib import Path
from typing import Any

from llama_index.core.schema import TextNode
from src.ingestion.chunker import chunk_documents
from src.ingestion.loader import load_documents
from src.logger import logger
from src.retrieval.embeddings import embedding_manager
from src.retrieval.vector_store import vector_store_manager


class IngestionPipeline:
    def __init__(self):
        self.embedding_manager = embedding_manager
        self.vector_store = vector_store_manager
        self.embedding_manager.initialize()
        self.vector_store.connect()

    def ingest_document(
        self,
        file_path: Path,
        metadata: dict[str, Any] | None = None,
        chunk_strategy: str = "sentence",
    ) -> dict[str, Any]:
        """
        Ingest a single document.
        Args:
            file_path: Path to the document
            metadata: Additional metadata
            chunk_strategy: Chunking strategy
        Returns:
            dict with ingestion statistics
        """
        logger.info(f"Ingesting document: {file_path}")
        documents = load_documents(file_path, metadata)
        if not documents:
            logger.warning(f"No documents loaded from {file_path}")
            return {"status": "failed", "reason": "No documents loaded"}
        chunks = chunk_documents(documents, strategy=chunk_strategy)
        if not chunks:
            logger.warning(f"No chunks created from {file_path}")
            return {"status": "failed", "reason": "No chunks created"}
        vector_store = self.vector_store.get_llama_index_vector_store()

        nodes = []
        for chunk in chunks:
            node = TextNode(
                text=chunk.text,
                metadata=chunk.metadata,
                id_=chunk.chunk_id,
            )
            nodes.append(node)
        try:
            vector_store.add(nodes)
            logger.info(f"Added {len(nodes)} chunks to vector store")
            return {
                "status": "success",
                "document": file_path.name,
                "chunks_created": len(chunks),
                "chunks_added": len(nodes),
            }
        except (ValueError, RuntimeError, OSError) as e:
            logger.error(f"Failed to add nodes to vector store: {e}")
            return {"status": "failed", "reason": str(e)}

    def ingest_directory(
        self,
        directory_path: Path,
        recursive: bool = True,
        chunk_strategy: str = "sentence",
    ) -> dict[str, Any]:
        """
        Ingest all documents in a directory.
        Args:
            directory_path: Path to directory
            recursive: Whether to traverse subdirectories
            chunk_strategy: Chunking strategy
        Returns:
            dict with ingestion statistics
        """
        logger.info(f"Ingesting directory: {directory_path}")
        documents = load_documents(directory_path, recursive=recursive)
        if not documents:
            logger.warning(f"No documents found in {directory_path}")
            return {"status": "failed", "reason": "No documents found"}
        chunks = chunk_documents(documents, strategy=chunk_strategy)
        if not chunks:
            logger.warning(f"No chunks created from {directory_path}")
            return {"status": "failed", "reason": "No chunks created"}
        vector_store = self.vector_store.get_llama_index_vector_store()
        nodes = []
        for chunk in chunks:
            node = TextNode(
                text=chunk.text,
                metadata=chunk.metadata,
                id_=chunk.chunk_id,
            )
            nodes.append(node)
        try:
            vector_store.add(nodes)
            logger.info(f"Added {len(nodes)} chunks from {len(documents)} documents")
            return {
                "status": "success",
                "documents_processed": len(documents),
                "chunks_created": len(chunks),
                "chunks_added": len(nodes),
            }
        except (ValueError, RuntimeError, OSError) as e:
            logger.error(f"Failed to add nodes to vector store: {e}")
            return {"status": "failed", "reason": str(e)}

    def get_stats(self) -> dict[str, Any]:
        stats = self.vector_store.get_collection_stats()
        return stats


ingestion_pipeline = IngestionPipeline()
