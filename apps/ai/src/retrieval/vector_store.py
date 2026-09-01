from typing import Any

import chromadb
import httpx
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from llama_index.vector_stores.chroma import ChromaVectorStore
from src.config import settings
from src.logger import logger


class VectorStoreManager:
    def __init__(self) -> None:
        self.collection_name = settings.chroma_collection
        self.host = settings.chroma_host
        self.port = settings.chroma_port
        self.persist_dir = str(settings.chroma_persist_dir)
        self.client: ClientAPI | None = None
        self.collection: Collection | None = None
        self._vector_store: ChromaVectorStore | None = None
        self._connected = False

    def connect(self) -> None:
        if self._connected and self.collection is not None:
            return
        try:
            logger.info(f"Connecting to ChromaDB at {self.host}:{self.port}...")
            self.client = chromadb.HttpClient(host=self.host, port=self.port)
            self.client.heartbeat()
            logger.info("Connected to ChromaDB server via HTTP")
        except (ValueError, OSError, httpx.HTTPError) as e:
            logger.warning(
                f"ChromaDB HTTP connection failed ({e}). Falling back to PersistentClient at {self.persist_dir}"
            )
            self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": settings.chroma_similarity_metric},
        )
        self._vector_store = ChromaVectorStore(chroma_collection=self.collection)
        self._connected = True
        logger.info(
            f"ChromaDB collection '{self.collection_name}' ready (documents: {self.collection.count()})"
        )

    def get_llama_index_vector_store(self) -> ChromaVectorStore:
        if not self._connected or self._vector_store is None:
            self.connect()
        if self._vector_store is None:
            raise RuntimeError("Failed to initialize ChromaVectorStore")
        return self._vector_store

    def get_collection_stats(self) -> dict[str, Any]:
        if not self._connected or self.collection is None:
            self.connect()
        if self.collection is None:
            return {"count": 0, "name": self.collection_name}
        count = self.collection.count()
        return {
            "name": self.collection_name,
            "count": count,
            "host": self.host,
            "port": self.port,
        }


vector_store_manager = VectorStoreManager()
