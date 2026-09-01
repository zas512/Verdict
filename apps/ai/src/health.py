import sys
from importlib.metadata import version
from pathlib import Path

project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.config import settings
from src.logger import logger


def check_llama_index() -> bool:
    try:
        import llama_index.core

        llama_ver = getattr(llama_index.core, "__version__", version("llama-index"))
        logger.info(f"LlamaIndex version: {llama_ver}")
        return True
    except ImportError as e:
        logger.error(f"❌ LlamaIndex import failed: {e}")
        return False


def check_chromadb() -> bool:
    try:
        import chromadb

        chroma_ver = getattr(chromadb, "__version__", "unknown")
        logger.info(f"ChromaDB imported successfully (v{chroma_ver})")
        return True
    except ImportError as e:
        logger.error(f"❌ ChromaDB import failed: {e}")
        return False


def check_ollama() -> bool:
    try:
        import ollama
    except ImportError as e:
        logger.error(f"Ollama library import failed: {e}")
        return False

    try:
        response = ollama.list()
        models = (
            getattr(response, "models", [])
            if hasattr(response, "models")
            else response.get("models", [])
        )
        logger.info(f"Ollama connected. Models: {len(models)}")
        for model in models:
            model_name = (
                getattr(model, "model", None)
                or getattr(model, "name", None)
                or (model.get("name") if isinstance(model, dict) else str(model))
            )
            logger.info(f"   - {model_name}")
        return True
    except (ollama.ResponseError, ollama.RequestError, OSError) as e:
        logger.error(f"Ollama connection/request failed: {e}")
        return False


def log_configuration() -> None:
    logger.info("Configuration:")
    logger.info(f"   - Environment: {settings.environment}")
    logger.info(f"   - Data Directory: {settings.data_dir}")
    logger.info(f"   - LLM Model: {settings.ollama_llm_model}")
    logger.info(f"   - Embedding Model: {settings.ollama_embed_model}")
    logger.info(f"   - ChromaDB Collection: {settings.chroma_collection}")
    logger.info(f"   - Chunk Size: {settings.chunk_size}")
    logger.info(f"   - Top K: {settings.top_k}")


def check_rag_setup() -> bool:
    """Run all system checks and log configuration."""
    logger.info("Testing RAG System Setup")
    llama_ok = check_llama_index()
    chroma_ok = check_chromadb()
    ollama_ok = check_ollama()

    log_configuration()

    if llama_ok and chroma_ok and ollama_ok:
        logger.info("All tests passed!")
        return True
    return False


# Alias for backwards compatibility
test_setup = check_rag_setup
