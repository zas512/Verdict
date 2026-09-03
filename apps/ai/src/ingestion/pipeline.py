from pathlib import Path
from typing import Any

from llama_index.core.schema import TextNode
from src.ingestion.chunker import chunk_documents
from src.ingestion.loader import load_documents
from src.logger import logger
from src.retrieval.embeddings import embedding_manager
from src.retrieval.vector_store import vector_store_manager


class IngestionPipeline:
    def __init__(self) -> None:
        self.embedding_manager = embedding_manager
        self.vector_store = vector_store_manager

    def _sanitize_metadata(self, metadata: dict[str, Any]) -> dict[str, Any]:
        sanitized: dict[str, Any] = {}
        for k, v in metadata.items():
            if isinstance(v, (str, int, float, bool)):
                sanitized[k] = v
            elif v is None:
                sanitized[k] = ""
            else:
                sanitized[k] = str(v)
        return sanitized

    def _prepare_nodes(self, chunks: list[Any]) -> list[TextNode]:
        if not chunks:
            return []
        texts = [chunk.text for chunk in chunks]
        logger.info(f"Generating embeddings for {len(texts)} chunks...")
        try:
            embeddings = self.embedding_manager.get_embeddings(texts)
        except (RuntimeError, ValueError, OSError) as e:
            logger.error(f"Batch embedding generation failed: {e}")
            raise
        nodes: list[TextNode] = []
        for chunk, emb in zip(chunks, embeddings):
            meta = self._sanitize_metadata(chunk.metadata)
            node = TextNode(
                text=chunk.text,
                metadata=meta,
                id_=chunk.chunk_id,
                embedding=emb,
            )
            nodes.append(node)
        return nodes

    def ingest_document(
        self,
        file_path: Path,
        metadata: dict[str, Any] | None = None,
        chunk_strategy: str = "sentence",
    ) -> dict[str, Any]:
        file_path = Path(file_path)
        logger.info(f"Ingesting document: {file_path}")
        documents = load_documents(file_path, metadata)
        if not documents:
            logger.warning(f"No documents loaded from {file_path}")
            return {"status": "failed", "reason": "No documents loaded"}
        chunks = chunk_documents(documents, strategy=chunk_strategy)
        if not chunks:
            logger.warning(f"No chunks created from {file_path}")
            return {"status": "failed", "reason": "No chunks created"}
        try:
            nodes = self._prepare_nodes(chunks)
            vector_store = self.vector_store.get_llama_index_vector_store()
            vector_store.add(nodes)
            logger.info(f"Successfully added {len(nodes)} chunks to vector store")
            return {
                "status": "success",
                "document": file_path.name,
                "chunks_created": len(chunks),
                "chunks_added": len(nodes),
            }
        except (RuntimeError, ValueError, OSError) as e:
            logger.error(f"Failed to add nodes to vector store: {e}")
            return {"status": "failed", "reason": str(e)}

    def ingest_directory(
        self,
        directory_path: Path,
        recursive: bool = True,
        chunk_strategy: str = "sentence",
    ) -> dict[str, Any]:
        directory_path = Path(directory_path)
        logger.info(f"Ingesting directory: {directory_path}")
        documents = load_documents(directory_path, recursive=recursive)
        if not documents:
            logger.warning(f"No documents found in {directory_path}")
            return {"status": "failed", "reason": "No documents found"}
        chunks = chunk_documents(documents, strategy=chunk_strategy)
        if not chunks:
            logger.warning(f"No chunks created from {directory_path}")
            return {"status": "failed", "reason": "No chunks created"}
        try:
            nodes = self._prepare_nodes(chunks)
            vector_store = self.vector_store.get_llama_index_vector_store()
            vector_store.add(nodes)
            logger.info(
                f"Successfully added {len(nodes)} chunks from {len(documents)} documents"
            )
            return {
                "status": "success",
                "documents_processed": len(documents),
                "chunks_created": len(chunks),
                "chunks_added": len(nodes),
            }
        except (RuntimeError, ValueError, OSError) as e:
            logger.error(f"Failed to add nodes to vector store: {e}")
            return {"status": "failed", "reason": str(e)}

    def get_stats(self) -> dict[str, Any]:
        return self.vector_store.get_collection_stats()


ingestion_pipeline = IngestionPipeline()
