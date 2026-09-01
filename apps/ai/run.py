import sys
from pathlib import Path

project_root = Path(__file__).parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))


def run_api() -> None:
    import uvicorn
    from src.config import settings
    from src.health import check_rag_setup
    from src.logger import logger

    if not check_rag_setup():
        logger.error("System check failed. Aborting API server startup.")
        sys.exit(1)

    logger.info(f"Starting RAG API on {settings.api_host}:{settings.api_port}")
    logger.info(f"Documentation: http://{settings.api_host}:{settings.api_port}/docs")
    logger.info(f"Health check: http://{settings.api_host}:{settings.api_port}/health")

    uvicorn.run(
        "src.api:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
        workers=1,
    )


if __name__ == "__main__":
    run_api()
