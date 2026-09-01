import argparse
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config import settings
from src.ingestion.pipeline import ingestion_pipeline
from src.logger import logger


def ingest_sample_documents():
    logger.info("Ingesting sample documents...")
    raw_dir = settings.raw_data_dir
    if not raw_dir.exists():
        logger.error(f"Raw data directory not found: {raw_dir}")
        logger.info(
            "Please create sample documents first using: uv run python scripts/seed_data.py"
        )
        return
    files = list(raw_dir.glob("*.*"))
    if not files:
        logger.error(f"No documents found in {raw_dir}")
        logger.info(
            "Please create sample documents first using: uv run python scripts/seed_data.py"
        )
        return
    result = ingestion_pipeline.ingest_directory(
        raw_dir,
        recursive=False,
        chunk_strategy=settings.chunk_strategy,
    )
    if result["status"] == "success":
        logger.info("Ingestion complete!")
        logger.info("Statistics:")
        logger.info(f"   - Documents processed: {result.get('documents_processed', 0)}")
        logger.info(f"   - Chunks created: {result.get('chunks_created', 0)}")
        logger.info(
            f"   - Chunks added to vector store: {result.get('chunks_added', 0)}"
        )
        stats = ingestion_pipeline.get_stats()
        logger.info(f"   - Total documents in store: {stats['count']}")
    else:
        logger.error(f"Ingestion failed: {result.get('reason', 'Unknown error')}")


def ingest_single_document(file_path: str):
    path = Path(file_path)
    if not path.exists():
        logger.error(f"File not found: {path}")
        return
    result = ingestion_pipeline.ingest_document(
        path,
        chunk_strategy=settings.chunk_strategy,
    )
    if result["status"] == "success":
        logger.info("Document ingested successfully!")
        logger.info(f"Chunks created: {result['chunks_created']}")
    else:
        logger.error(f"Ingestion failed: {result.get('reason', 'Unknown error')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest documents into RAG system")
    parser.add_argument("--file", type=str, help="Path to a single document to ingest")
    parser.add_argument(
        "--dir", type=str, help="Path to directory containing documents to ingest"
    )
    args = parser.parse_args()
    if args.file:
        ingest_single_document(args.file)
    elif args.dir:
        # TODO: Implement directory ingestion
        logger.info(
            "Directory ingestion not yet implemented. Using sample documents instead."
        )
        ingest_sample_documents()
    else:
        ingest_sample_documents()
