import argparse
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.health import check_rag_setup
from src.logger import logger


def main() -> int:
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
        return 0 if check_rag_setup() else 1
    elif args.command == "api":
        logger.info("Starting API server...")
        # TODO: Import and run API
        logger.warning("API not yet implemented")
        return 0
    elif args.command == "ingest":
        if args.file:
            logger.info(f"Would ingest file: {args.file}")
            # TODO: Implement ingestion CLI
            logger.warning("Ingestion CLI not yet implemented")
        else:
            logger.error("Please provide --file path")
            return 1
    elif args.command == "query":
        if args.query:
            logger.info(f"Would query: {args.query}")
            # TODO: Implement query CLI
            logger.warning("Query CLI not yet implemented")
        else:
            logger.error("Please provide --query string")
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
