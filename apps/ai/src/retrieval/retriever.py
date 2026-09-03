import re
from typing import Any

from llama_index.core.schema import NodeWithScore, TextNode
from src.config import settings
from src.logger import logger
from src.retrieval.embeddings import embedding_manager
from src.retrieval.vector_store import vector_store_manager


class LegalRetriever:
    def __init__(self) -> None:
        self.embedding_manager = embedding_manager
        self.vector_store = vector_store_manager

    def _get_where_clause(
        self, matter_id: str | None = None, extra_filters: dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        filters: list[dict[str, Any]] = []
        if matter_id:
            filters.append({"matter_id": {"$eq": matter_id}})
        if extra_filters:
            for k, v in extra_filters.items():
                filters.append({k: {"$eq": v}})
        if not filters:
            return None
        if len(filters) == 1:
            return filters[0]
        return {"$and": filters}

    def _normalize_score(self, distance: float, metric: str = "cosine") -> float:
        if metric == "cosine":
            score = 1.0 - (distance / 2.0)
        elif metric == "euclidean":
            score = 1.0 / (1.0 + distance)
        else:
            score = max(0.0, min(1.0, 1.0 - distance))
        return max(0.0, min(1.0, score))

    def _keyword_overlap_score(self, query: str, text: str) -> float:
        query_words = set(re.findall(r"\w+", query.lower()))
        if not query_words:
            return 0.0
        text_words = set(re.findall(r"\w+", text.lower()))
        overlap = query_words.intersection(text_words)
        return len(overlap) / len(query_words)

    def search(
        self,
        query: str,
        top_k: int | None = None,
        matter_id: str | None = None,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        k = top_k or settings.top_k
        self.vector_store.connect()
        collection = self.vector_store.collection
        if collection is None or collection.count() == 0:
            logger.warning("Vector store is empty or collection not available")
            return []
        try:
            query_embedding = self.embedding_manager.get_embedding(query)
        except (RuntimeError, ValueError, OSError, ConnectionError) as e:
            logger.error(f"Failed to generate query embedding: {e}")
            return []
        where_clause = self._get_where_clause(matter_id, filters)
        n_results = min(
            k * 2 if settings.use_reranker else k, max(1, collection.count())
        )
        query_args: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_clause:
            query_args["where"] = where_clause

        try:
            results = collection.query(**query_args)
        except (RuntimeError, ValueError, OSError, ConnectionError) as e:
            logger.error(f"ChromaDB query failed: {e}")
            return []
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        ids = results.get("ids", [[]])[0]
        retrieved: list[dict[str, Any]] = []
        for i, doc_text in enumerate(documents):
            meta = metadatas[i] if i < len(metadatas) and metadatas[i] else {}
            dist = distances[i] if i < len(distances) else 1.0
            chunk_id = ids[i] if i < len(ids) else f"chunk_{i}"
            sim_score = self._normalize_score(dist, settings.chroma_similarity_metric)
            lexical_score = self._keyword_overlap_score(query, doc_text)
            rerank_score = (
                (0.75 * sim_score) + (0.25 * lexical_score)
                if settings.use_reranker
                else sim_score
            )
            retrieved.append({
                "chunk_id": chunk_id,
                "document_id": meta.get("file_name", chunk_id),
                "document_name": meta.get("file_name", "Unknown Document"),
                "chunk_text": doc_text,
                "similarity_score": round(sim_score, 4),
                "rerank_score": round(rerank_score, 4),
                "page_number": meta.get("page_number", meta.get("chunk_index", 0) + 1),
                "metadata": meta,
            })
        if settings.use_reranker:
            retrieved.sort(key=lambda x: x["rerank_score"], reverse=True)
        else:
            retrieved.sort(key=lambda x: x["similarity_score"], reverse=True)
        final_results = retrieved[:k]
        logger.info(
            f"Retrieved {len(final_results)} chunks for query: '{query[:40]}...' (Top score: {final_results[0]['similarity_score'] if final_results else 0})"
        )
        return final_results

    def retrieve_nodes(
        self,
        query: str,
        top_k: int | None = None,
        matter_id: str | None = None,
    ) -> list[NodeWithScore]:
        chunks = self.search(query, top_k=top_k, matter_id=matter_id)
        nodes: list[NodeWithScore] = []
        for c in chunks:
            text_node = TextNode(
                text=c["chunk_text"],
                metadata=c["metadata"],
                id_=c["chunk_id"],
            )
            nodes.append(NodeWithScore(node=text_node, score=c["similarity_score"]))
        return nodes


retriever = LegalRetriever()
