from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Environment: development, staging, production",
    )
    debug: bool = Field(default=True, description="Debug mode")
    data_dir: Path = Field(default=Path("./data"), description="Root data directory")
    raw_data_dir: Path = Field(
        default=Path("./data/raw"), description="Raw documents directory"
    )
    processed_data_dir: Path = Field(
        default=Path("./data/processed"), description="Processed data directory"
    )
    ollama_host: str = Field(
        default="http://localhost:11434", description="Ollama API host"
    )
    ollama_embed_model: str = Field(
        default="nomic-embed-text", description="Embedding model name"
    )
    ollama_llm_model: str = Field(default="gemma3:1b", description="LLM model name")
    ollama_temperature: float = Field(
        default=0.1, ge=0.0, le=1.0, description="LLM temperature"
    )
    ollama_max_tokens: int = Field(
        default=512, ge=1, description="Max tokens for generation"
    )
    ollama_timeout: int = Field(
        default=60, ge=1, description="Request timeout in seconds"
    )
    chroma_host: str = Field(default="localhost", description="ChromaDB host")
    chroma_port: int = Field(default=8000, ge=1, le=65535, description="ChromaDB port")
    chroma_persist_dir: Path = Field(
        default=Path("./chroma_db"), description="ChromaDB persistence directory"
    )
    chroma_collection: str = Field(default="legal_docs", description="Collection name")
    chroma_similarity_metric: Literal["cosine", "euclidean", "dot"] = Field(
        default="cosine", description="Similarity metric for vector search"
    )
    chunk_size: int = Field(
        default=512, ge=100, le=2048, description="Chunk size in characters"
    )
    chunk_overlap: int = Field(
        default=50, ge=0, description="Chunk overlap in characters"
    )
    chunk_separator: str = Field(default=" ", description="Separator for chunking")
    chunk_strategy: Literal["sentence", "fixed", "semantic", "legal"] = Field(
        default="sentence", description="Chunking strategy"
    )
    top_k: int = Field(
        default=5, ge=1, le=20, description="Number of chunks to retrieve"
    )
    similarity_threshold: float = Field(
        default=0.7, ge=0.0, le=1.0, description="Minimum similarity score"
    )
    use_reranker: bool = Field(
        default=True, description="Use reranker for better results"
    )
    reranker_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-6-v2",
        description="Reranker model name",
    )
    reranker_top_n: int = Field(
        default=3, ge=1, description="Number of chunks after reranking"
    )
    enable_guardrails: bool = Field(default=True, description="Enable guardrails")
    min_chunk_score: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Minimum chunk score for response"
    )
    max_context_tokens: int = Field(
        default=2000, ge=100, description="Max context tokens for LLM"
    )
    api_host: str = Field(default="0.0.0.0", description="API host")
    api_port: int = Field(default=8000, ge=1, le=65535, description="API port")
    api_prefix: str = Field(
        default="/api/ai", description="API prefix for RAG endpoints"
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="CORS allowed origins",
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Log level"
    )
    log_file: Path = Field(default=Path("./logs/rag.log"), description="Log file path")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

    def model_post_init(self, context: object, /) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.raw_data_dir.mkdir(parents=True, exist_ok=True)
        self.processed_data_dir.mkdir(parents=True, exist_ok=True)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self.chroma_persist_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()

if settings.debug:
    print(f"Environment: {settings.environment}")
    print(f"Data Directory: {settings.data_dir}")
    print(f"LLM: {settings.ollama_llm_model}")
    print(f"Embedding: {settings.ollama_embed_model}")
    print(f"API Prefix: {settings.api_prefix}")
