import io
import sys

from loguru import logger
from src.config import settings


def setup_logging() -> None:
    logger.remove()
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    logger.add(
        sys.stdout,
        format=(
            "<green>{time:HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name: <15}</cyan> | "
            "<level>{message}</level>"
        ),
        level=settings.log_level,
        colorize=True,
        backtrace=True,
        diagnose=settings.debug,
    )
    log_file = settings.log_file
    logger.add(
        log_file,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name} | {function}:{line} | {message}",
        level=settings.log_level,
        rotation="10 MB",
        retention="30 days",
        compression="zip",
        encoding="utf-8",
        backtrace=True,
        diagnose=settings.debug,
    )
    logger.add(
        log_file.parent / "errors.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name} | {function}:{line} | {message}",
        level="ERROR",
        rotation="100 MB",
        retention="30 days",
        compression="zip",
        encoding="utf-8",
    )


setup_logging()
__all__ = ["logger"]
