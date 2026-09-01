"""Document loading utilities for various file formats."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import docx
import markdown
import pdfplumber
from bs4 import BeautifulSoup
from pypdf import PdfReader

from src.config import settings
from src.logger import logger


class DocumentLoader:
    """Load and parse documents from various formats."""

    SUPPORTED_EXTENSIONS: dict[str, str] = {
        ".pdf": "pdf",
        ".docx": "docx",
        ".txt": "text",
        ".md": "markdown",
        ".html": "html",
        ".htm": "html",
    }

    @staticmethod
    def load_pdf(file_path: Path) -> str:
        """Extract text from PDF using pdfplumber (better for tables)."""
        try:
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        except (OSError, ValueError, AttributeError) as e:
            logger.warning(
                f"pdfplumber failed for {file_path}, falling back to pypdf: {e}"
            )
            # Fallback to pypdf
            reader = PdfReader(str(file_path))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text

    @staticmethod
    def load_docx(file_path: Path) -> str:
        """Extract text from Word document."""
        doc = docx.Document(str(file_path))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text

    @staticmethod
    def load_text(file_path: Path) -> str:
        """Load plain text file."""
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    @staticmethod
    def load_markdown(file_path: Path) -> str:
        """Load and convert markdown to text."""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        # Convert markdown to HTML, then extract text
        html = markdown.markdown(content)
        soup = BeautifulSoup(html, "html.parser")
        return soup.get_text()

    @staticmethod
    def load_html(file_path: Path) -> str:
        """Extract text from HTML file."""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        soup = BeautifulSoup(content, "html.parser")
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        return soup.get_text()

    @classmethod
    def load_document(
        cls, file_path: Path, metadata: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Load a document and return its content with metadata.

        Args:
            file_path: Path to the document
            metadata: Additional metadata to attach

        Returns:
            dict with 'content', 'metadata', 'file_path', 'file_type'
        """
        file_path = Path(file_path)
        if not file_path.exists():
            msg = f"File not found: {file_path}"
            raise FileNotFoundError(msg)

        extension = file_path.suffix.lower()
        file_type = cls.SUPPORTED_EXTENSIONS.get(extension)

        if file_type is None:
            msg = f"Unsupported file type: {extension}"
            raise ValueError(msg)

        logger.info(f"📄 Loading {file_type} document: {file_path.name}")

        # Load based on file type
        loaders: dict[str, Any] = {
            "pdf": cls.load_pdf,
            "docx": cls.load_docx,
            "text": cls.load_text,
            "markdown": cls.load_markdown,
            "html": cls.load_html,
        }

        content = loaders[file_type](file_path)

        # Prepare metadata
        doc_metadata: dict[str, Any] = {
            "file_name": file_path.name,
            "file_path": str(file_path),
            "file_type": file_type,
            "file_size": file_path.stat().st_size,
            "loaded_at": datetime.now(tz=timezone.utc).isoformat(),
        }

        if metadata:
            doc_metadata.update(metadata)

        return {
            "content": content,
            "metadata": doc_metadata,
            "file_path": str(file_path),
            "file_type": file_type,
        }

    @classmethod
    def load_directory(
        cls, directory_path: Path, recursive: bool = True
    ) -> list[dict[str, Any]]:
        """Load all supported documents from a directory."""
        directory_path = Path(directory_path)
        if not directory_path.exists():
            msg = f"Directory not found: {directory_path}"
            raise FileNotFoundError(msg)

        documents: list[dict[str, Any]] = []
        pattern = "**/*" if recursive else "*"

        for file_path in directory_path.glob(pattern):
            if (
                file_path.is_file()
                and file_path.suffix.lower() in cls.SUPPORTED_EXTENSIONS
            ):
                try:
                    doc = cls.load_document(file_path)
                    documents.append(doc)
                except (OSError, ValueError, FileNotFoundError) as e:
                    logger.error(f"❌ Failed to load {file_path}: {e}")

        logger.info(f"✅ Loaded {len(documents)} documents from {directory_path}")
        return documents


# Convenience function
def load_documents(
    source: Path, metadata: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    """Load documents from a file or directory."""
    source = Path(source)
    if source.is_file():
        return [DocumentLoader.load_document(source, metadata)]
    if source.is_dir():
        return DocumentLoader.load_directory(source)
    msg = f"Source does not exist: {source}"
    raise ValueError(msg)
