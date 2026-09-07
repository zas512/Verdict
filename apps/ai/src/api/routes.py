import base64
import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from src.config import settings
from src.generation.llm import response_generator
from src.guardrails.filters import guardrails
from src.health import check_rag_setup
from src.ingestion.loader import DocumentLoader
from src.ingestion.pipeline import ingestion_pipeline
from src.logger import logger
from src.retrieval.embeddings import embedding_manager
from src.retrieval.retriever import retriever
from src.retrieval.vector_store import vector_store_manager

router = APIRouter(tags=["Verdict AI Chat & RAG"])


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing Legal RAG AI services...")
    try:
        embedding_manager.initialize()
        vector_store_manager.connect()
        logger.info("AI services initialized successfully.")
    except (RuntimeError, ValueError, OSError) as e:
        logger.warning(f"Non-fatal initialization warning: {e}")
    yield
    logger.info("Shutting down Legal RAG AI services...")


app = FastAPI(
    title="Verdict AI Legal RAG API",
    description="Intelligent legal document retrieval, context-aware QA, and multi-turn chat assistant.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
if settings.api_prefix and settings.api_prefix != "":
    app.include_router(router, prefix=settings.api_prefix)


class SourceItem(BaseModel):
    document_id: str
    document_name: str
    chunk_text: str
    similarity_score: float
    page_number: int | None = 1


class LegalCitationItem(BaseModel):
    title: str
    source: str
    year: str | None = None
    summary: str | None = None


class ChatMessageItem(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")


class ChatAttachmentItem(BaseModel):
    id: str | None = None
    name: str = Field(..., description="File name of attachment")
    type: str | None = None
    size: int | None = None
    content: str | None = None
    base64: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., description="Current user prompt or query")
    history: list[ChatMessageItem] = Field(
        default_factory=list, description="Previous messages in current chat session"
    )
    matter_id: str | None = Field(
        default=None, description="Active matter / case context ID"
    )
    attachments: list[ChatAttachmentItem] = Field(
        default_factory=list, description="Shared files or document excerpts"
    )
    top_k: int = Field(default=5, ge=1, le=20, description="Context retrieval limit")
    mask_pii: bool = Field(default=False, description="Whether to mask PII in response")


class ChatResponse(BaseModel):
    answer: str
    citations: list[LegalCitationItem] = Field(default_factory=list)
    sources: list[SourceItem] = Field(default_factory=list)
    confidence: float = 0.9
    has_answer: bool = True
    matter_id: str | None = None


class QueryRequest(BaseModel):
    question: str = Field(..., description="User's legal question or search query")
    matter_id: str | None = Field(
        default=None, description="Matter/Case ID to filter search"
    )
    top_k: int = Field(default=5, ge=1, le=20, description="Number of context chunks")
    include_sources: bool = Field(
        default=True, description="Whether to include source chunk excerpts"
    )
    mask_pii: bool = Field(default=False, description="Whether to mask PII in response")


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem] = Field(default_factory=list)
    citations: list[LegalCitationItem] = Field(default_factory=list)
    confidence: float
    has_answer: bool
    matter_id: str | None = None


class IngestResponse(BaseModel):
    status: str
    document_id: str | None = None
    filename: str | None = None
    file_type: str | None = None
    text_preview: str | None = None
    content: str | None = None
    chunks_created: int = 0
    matter_id: str | None = None
    message: str


class HealthStatus(BaseModel):
    status: str
    environment: str
    llm_model: str
    embedding_model: str
    collection_stats: dict[str, Any]


@app.get("/health", tags=["Health"])
@router.get("/health")
def health_check() -> HealthStatus:
    is_ok = check_rag_setup()
    stats = vector_store_manager.get_collection_stats()
    return HealthStatus(
        status="healthy" if is_ok else "degraded",
        environment=settings.environment,
        llm_model=settings.ollama_llm_model,
        embedding_model=settings.ollama_embed_model,
        collection_stats=stats,
    )


def _process_attachment_content(att: ChatAttachmentItem) -> dict[str, Any]:
    """Helper to ensure attachment content is converted to text for prompt context."""
    text_content = att.content or ""

    # If base64 provided and no text content, decode and parse
    if not text_content and att.base64:
        try:
            # Strip data URL prefix if present (e.g. data:application/pdf;base64,...)
            raw_b64 = att.base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            binary_data = base64.b64decode(raw_b64)

            # Write to a temporary file in raw_data_dir to load via DocumentLoader
            temp_path = settings.raw_data_dir / f"temp_{att.name}"
            temp_path.write_bytes(binary_data)
            try:
                doc = DocumentLoader.load_document(temp_path)
                text_content = doc.get("content", "")
            finally:
                if temp_path.exists():
                    temp_path.unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"Failed to decode/parse base64 attachment {att.name}: {e}")

    return {
        "id": att.id or att.name,
        "name": att.name,
        "content": text_content,
        "type": att.type,
    }


@router.post("/chat")
def chat_endpoint(request: ChatRequest) -> ChatResponse:
    logger.info(
        f"Incoming chat prompt: '{request.message[:60]}' (matter_id={request.matter_id}, attachments={len(request.attachments)})"
    )

    # 1. Process attachments
    processed_attachments = [
        _process_attachment_content(att) for att in request.attachments
    ]

    # 2. Retrieve vector store chunks
    context_chunks = []
    clean_msg = request.message.strip().lower()
    is_greeting = clean_msg in {
        "hi",
        "hello",
        "hey",
        "help",
        "who are you",
        "what can you do",
        "good morning",
        "good afternoon",
        "thanks",
        "thank you",
    }
    if not is_greeting or request.matter_id:
        try:
            raw_chunks = retriever.search(
                query=request.message,
                top_k=request.top_k,
                matter_id=request.matter_id,
            )
            _, context_chunks = guardrails.check_retrieval_confidence(raw_chunks)
        except Exception as e:
            logger.warning(f"Vector search retrieval warning: {e}")

    # 3. Generate response using local Ollama model
    chat_result = response_generator.chat(
        message=request.message,
        history=[h.model_dump() for h in request.history],
        context_chunks=context_chunks,
        attachments=processed_attachments,
        matter_id=request.matter_id,
    )

    # 4. Sanitize and structure output
    sanitized_answer = guardrails.sanitize_output(
        chat_result["answer"],
        include_disclaimer=False,
        mask_pii=request.mask_pii,
    )

    sources = [
        SourceItem(
            document_id=s.get("document_id", "doc"),
            document_name=s.get("document_name", "Document"),
            chunk_text=s.get("chunk_text", ""),
            similarity_score=s.get("similarity_score", 1.0),
            page_number=s.get("page_number", 1),
        )
        for s in chat_result.get("sources", [])
    ]

    citations = [
        LegalCitationItem(
            title=c.get("title", ""),
            source=c.get("source", "Legal Precedent / Statute"),
            year=c.get("year"),
            summary=c.get("summary"),
        )
        for c in chat_result.get("citations", [])
    ]

    return ChatResponse(
        answer=sanitized_answer,
        citations=citations,
        sources=sources,
        confidence=chat_result.get("confidence", 0.9),
        has_answer=chat_result.get("has_answer", True),
        matter_id=request.matter_id,
    )


@router.post("/chat/stream")
def chat_stream(request: ChatRequest) -> StreamingResponse:
    logger.info(f"Incoming streaming chat query: '{request.message[:60]}'")
    processed_attachments = [
        _process_attachment_content(att) for att in request.attachments
    ]
    context_chunks = []
    try:
        raw_chunks = retriever.search(
            query=request.message,
            top_k=request.top_k,
            matter_id=request.matter_id,
        )
        _, context_chunks = guardrails.check_retrieval_confidence(raw_chunks)
    except Exception as e:
        logger.warning(f"Stream vector search warning: {e}")

    events = response_generator.generate_stream(
        query=request.message,
        context_chunks=context_chunks,
        attachments=processed_attachments,
        history=[h.model_dump() for h in request.history],
        matter_id=request.matter_id,
    )
    return StreamingResponse(
        events,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/query")
def query_documents(request: QueryRequest) -> QueryResponse:
    logger.info(
        f"Incoming query: '{request.question[:60]}' (matter_id={request.matter_id})"
    )
    chunks = []
    try:
        raw_chunks = retriever.search(
            query=request.question,
            top_k=request.top_k,
            matter_id=request.matter_id,
        )
        _, chunks = guardrails.check_retrieval_confidence(raw_chunks)
    except Exception as e:
        logger.warning(f"Retriever search error: {e}")

    gen_result = response_generator.chat(
        message=request.question,
        context_chunks=chunks,
        matter_id=request.matter_id,
    )

    sanitized_answer = guardrails.sanitize_output(
        gen_result["answer"],
        include_disclaimer=True,
        mask_pii=request.mask_pii,
    )
    sources = (
        [
            SourceItem(
                document_id=s.get("document_id", "doc"),
                document_name=s.get("document_name", "Document"),
                chunk_text=s.get("chunk_text", ""),
                similarity_score=s.get("similarity_score", 0.0),
                page_number=s.get("page_number", 1),
            )
            for s in gen_result.get("sources", [])
        ]
        if request.include_sources
        else []
    )
    citations = [
        LegalCitationItem(
            title=c.get("title", ""),
            source=c.get("source", "Legal Authority"),
            year=c.get("year"),
            summary=c.get("summary"),
        )
        for c in gen_result.get("citations", [])
    ]
    return QueryResponse(
        answer=sanitized_answer,
        sources=sources,
        citations=citations,
        confidence=gen_result.get("confidence", 0.85),
        has_answer=gen_result.get("has_answer", True),
        matter_id=request.matter_id,
    )


UPLOAD_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: {"description": "Uploaded file has no filename or is invalid."},
    500: {"description": "Failed to save or process the uploaded file."},
}


@router.post("/upload", responses=UPLOAD_RESPONSES)
@router.post("/ingest", responses=UPLOAD_RESPONSES)
async def upload_document(
    file: UploadFile = File(...),
    matter_id: str | None = Form(default=None),
    metadata_json: str | None = Form(default=None),
) -> IngestResponse:
    """Upload document, parse text, and optionally index in ChromaDB."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    save_dir = settings.raw_data_dir
    save_path = save_dir / file.filename
    try:
        content = await file.read()
        save_path.write_bytes(content)
        logger.info(f"Saved uploaded file to {save_path} ({len(content)} bytes)")
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}") from e

    meta: dict[str, Any] = {}
    if metadata_json:
        try:
            meta = json.loads(metadata_json)
        except Exception:
            logger.warning("Could not parse metadata_json, using default")
    if matter_id:
        meta["matter_id"] = matter_id

    # Parse and extract text content
    extracted_text = ""
    file_type = "unknown"
    try:
        doc_data = DocumentLoader.load_document(save_path, metadata=meta)
        extracted_text = doc_data.get("content", "")
        file_type = doc_data.get("file_type", "document")
    except Exception as e:
        logger.warning(f"Could not load via DocumentLoader: {e}")

    # Index into vector store
    chunks_created = 0
    try:
        result = ingestion_pipeline.ingest_document(
            save_path,
            metadata=meta,
            chunk_strategy=settings.chunk_strategy,
        )
        if result.get("status") == "success":
            chunks_created = result.get("chunks_created", 0)
    except Exception as e:
        logger.warning(f"ChromaDB ingestion skipped/errored: {e}")

    return IngestResponse(
        status="success",
        document_id=file.filename,
        filename=file.filename,
        file_type=file_type,
        text_preview=extracted_text[:300] if extracted_text else "",
        content=extracted_text,
        chunks_created=chunks_created,
        matter_id=matter_id,
        message=f"Document '{file.filename}' processed successfully ({len(extracted_text)} characters extracted).",
    )


@router.get("/matters/{matter_id}/context")
def get_matter_context(matter_id: str, top_k: int = 10) -> dict[str, Any]:
    chunks = retriever.search(
        query="matter overview and agreement summary",
        top_k=top_k,
        matter_id=matter_id,
    )
    return {
        "matter_id": matter_id,
        "chunks_count": len(chunks),
        "chunks": chunks,
    }


@router.get("/matters/{matter_id}/documents")
def get_matter_documents(matter_id: str) -> dict[str, Any]:
    chunks = retriever.search(
        query="document title and contents",
        top_k=50,
        matter_id=matter_id,
    )
    unique_docs: dict[str, dict[str, Any]] = {}
    for c in chunks:
        doc_name = c.get("document_name")
        if doc_name and doc_name not in unique_docs:
            unique_docs[doc_name] = {
                "document_name": doc_name,
                "document_id": c.get("document_id"),
                "sample_chunk": c.get("chunk_text", "")[:150],
            }
    return {
        "matter_id": matter_id,
        "documents": list(unique_docs.values()),
    }
