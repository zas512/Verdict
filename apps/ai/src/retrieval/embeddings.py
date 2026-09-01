from llama_index.core import Settings
from llama_index.embeddings.ollama import OllamaEmbedding
from src.config import settings
from src.logger import logger


class EmbeddingManager:
    def __init__(self):
        self.model_name = settings.ollama_embed_model
        self.host = settings.ollama_host
        self.embed_model: OllamaEmbedding | None = None
        self._initialized = False

    def initialize(self) -> None:
        if self._initialized:
            return
        try:
            logger.info(f"Initializing embedding model: {self.model_name}")
            self.embed_model = OllamaEmbedding(
                model_name=self.model_name,
                base_url=self.host,
                ollama_additional_kwargs={"mirostat": 0},
            )
            Settings.embed_model = self.embed_model
            self._initialized = True
            logger.info(f"Embedding model initialized: {self.model_name}")
        except (ValueError, RuntimeError, ConnectionError) as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            raise

    @property
    def model(self) -> OllamaEmbedding:
        """Get initialized embedding model, initializing if needed."""
        if not self._initialized or self.embed_model is None:
            self.initialize()
        if self.embed_model is None:
            raise RuntimeError("Embedding model is not initialized")
        return self.embed_model

    def get_embedding(self, text: str) -> list[float]:
        try:
            embedding = self.model.get_text_embedding(text)
            return embedding
        except (ValueError, RuntimeError, ConnectionError) as e:
            logger.error(f"Failed to get embedding: {e}")
            raise

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Get embeddings for multiple texts."""
        try:
            embeddings = self.model.get_text_embedding_batch(texts)
            return embeddings
        except (ValueError, RuntimeError, ConnectionError) as e:
            logger.error(f"Failed to get embeddings: {e}")
            raise


embedding_manager = EmbeddingManager()
