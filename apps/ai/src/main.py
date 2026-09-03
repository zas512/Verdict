import argparse
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.config import settings
from src.generation.llm import response_generator
from src.guardrails.filters import guardrails
from src.health import check_rag_setup
from src.ingestion.pipeline import ingestion_pipeline
from src.logger import logger
from src.retrieval.retriever import retriever


def run_api(
    host: str | None = None, port: int | None = None, reload: bool = True
) -> int:
    import uvicorn

    h = host or settings.api_host
    p = port or settings.api_port
    logger.info(f"Starting Legal RAG API server on http://{h}:{p}")
    uvicorn.run("src.api.routes:app", host=h, port=p, reload=reload)
    return 0


def run_ingest(file_path: str | None = None, dir_path: str | None = None) -> int:
    if file_path:
        p = Path(file_path)
        if not p.exists():
            logger.error(f"File not found: {p}")
            return 1
        res = ingestion_pipeline.ingest_document(p)
        logger.info(f"Ingestion result: {res}")
        return 0 if res.get("status") == "success" else 1
    elif dir_path:
        p = Path(dir_path)
        if not p.exists():
            logger.error(f"Directory not found: {p}")
            return 1
        res = ingestion_pipeline.ingest_directory(p)
        logger.info(f"Directory ingestion result: {res}")
        return 0 if res.get("status") == "success" else 1
    else:
        logger.error("Please specify --file or --dir to ingest.")
        return 1


def run_query(query_str: str, matter_id: str | None = None, top_k: int = 5) -> int:
    logger.info(f"Executing query: '{query_str}'")
    chunks = retriever.search(query_str, top_k=top_k, matter_id=matter_id)

    has_context, valid_chunks = guardrails.check_retrieval_confidence(chunks)
    if not has_context:
        print("\n--- Answer ---")
        print("No sufficiently confident document context found in the database.")
        return 0

    gen_result = response_generator.generate(
        query_str, valid_chunks, matter_id=matter_id
    )
    answer = guardrails.sanitize_output(gen_result["answer"], include_disclaimer=True)

    print("\n" + "=" * 60)
    print("QUERY:", query_str)
    print("=" * 60)
    print("ANSWER:\n" + answer)
    print("=" * 60)
    print(f"CONFIDENCE: {gen_result['confidence']}")
    print("\nSOURCES:")
    for s in gen_result["sources"]:
        print(
            f" - [{s['document_name']} (score: {s['similarity_score']})] {s['chunk_text'][:120]}..."
        )
    print("=" * 60 + "\n")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Legal RAG System CLI")
    parser.add_argument(
        "command",
        nargs="?",
        default="test",
        choices=["test", "api", "ingest", "query"],
        help="Command to run: test, api, ingest, query",
    )
    parser.add_argument("--query", type=str, help="Query string for testing")
    parser.add_argument("--file", type=str, help="File path for ingestion")
    parser.add_argument("--dir", type=str, help="Directory path for ingestion")
    parser.add_argument("--matter-id", type=str, help="Matter/Case ID filter")
    parser.add_argument("--host", type=str, help="API server host")
    parser.add_argument("--port", type=int, help="API server port")
    parser.add_argument("--top-k", type=int, default=5, help="Top K context chunks")
    args = parser.parse_args()

    if args.command == "test":
        return 0 if check_rag_setup() else 1
    elif args.command == "api":
        return run_api(host=args.host, port=args.port)
    elif args.command == "ingest":
        return run_ingest(file_path=args.file, dir_path=args.dir)
    elif args.command == "query":
        if not args.query:
            logger.error("Please provide --query string")
            return 1
        return run_query(args.query, matter_id=args.matter_id, top_k=args.top_k)
    return 0


if __name__ == "__main__":
    sys.exit(main())
