import sys
from importlib.metadata import version
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config import settings
from src.logger import logger


def test_setup() -> bool:
    logger.info("🧪 Testing RAG System Setup")
    try:
        import llama_index.core
        llama_ver = version("llama-index")
        logger.info(f"✅ LlamaIndex version: {llama_ver}")
    except ImportError as e:
        logger.error(f"❌ LlamaIndex import failed: {e}")
        return False

    try:
        import chromadb
        logger.info("✅ ChromaDB imported successfully")
    except ImportError as e:
        logger.error(f"❌ ChromaDB import failed: {e}")
        return False

    try:
        import ollama

        response = ollama.list()
        models = (
            getattr(response, "models", [])
            if hasattr(response, "models")
            else response.get("models", [])
        )
        logger.info(f"✅ Ollama connected. Models: {len(models)}")
        for model in models:
            model_name = (
                getattr(model, "model", None)
                or getattr(model, "name", None)
                or (model.get("name") if isinstance(model, dict) else str(model))
            )
            logger.info(f"   - {model_name}")
    except (ImportError, OSError) as e:
        logger.error(f"❌ Ollama connection failed: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Ollama request failed: {e}")
        return False
    logger.info("Configuration:")
    logger.info(f"   - Environment: {settings.environment}")
    logger.info(f"   - Data Directory: {settings.data_dir}")
    logger.info(f"   - LLM Model: {settings.ollama_llm_model}")
    logger.info(f"   - Embedding Model: {settings.ollama_embed_model}")
    logger.info(f"   - ChromaDB Collection: {settings.chroma_collection}")
    logger.info(f"   - Chunk Size: {settings.chunk_size}")
    logger.info(f"   - Top K: {settings.top_k}")
    logger.info("All tests passed!")
    return True


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Legal RAG System")
    parser.add_argument(
        "command",
        nargs="?",
        default="test",
        choices=["test", "api", "ingest", "query"],
        help="Command to run",
    )
    parser.add_argument("--query", type=str, help="Query string for testing")
    parser.add_argument("--file", type=str, help="File path for ingestion")
    args = parser.parse_args()
    if args.command == "test":
        return 0 if test_setup() else 1
    elif args.command == "api":
        logger.info("🚀 Starting API server...")
        # TODO: Import and run API
        logger.warning("API not yet implemented")
        return 0
    elif args.command == "ingest":
        if args.file:
            logger.info(f"📄 Would ingest file: {args.file}")
            # TODO: Implement ingestion CLI
            logger.warning("Ingestion CLI not yet implemented")
        else:
            logger.error("Please provide --file path")
            return 1
    elif args.command == "query":
        if args.query:
            logger.info(f"📝 Would query: {args.query}")
            # TODO: Implement query CLI
            logger.warning("Query CLI not yet implemented")
        else:
            logger.error("Please provide --query string")
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
