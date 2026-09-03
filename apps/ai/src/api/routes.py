import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from src.config import settings
from src.generation.llm import response_generator
from src.guardrails.filters import guardrails
from src.health import check_rag_setup
from src.ingestion.pipeline import ingestion_pipeline
from src.logger import logger
from src.retrieval.embeddings import embedding_manager
from src.retrieval.retriever import retriever
from src.retrieval.vector_store import vector_store_manager

router = APIRouter(prefix=settings.api_prefix, tags=["Legal RAG"])


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
    description="Intelligent legal document retrieval and context-aware QA assistant.",
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


class SourceItem(BaseModel):
    document_id: str
    document_name: str
    chunk_text: str
    similarity_score: float
    page_number: int | None = 1


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
    confidence: float
    has_answer: bool
    matter_id: str | None = None


class IngestResponse(BaseModel):
    status: str
    document_id: str | None = None
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


@router.post("/query")
def query_documents(request: QueryRequest) -> QueryResponse:
    logger.info(
        f"Incoming query: '{request.question[:60]}' (matter_id={request.matter_id})"
    )
    chunks = retriever.search(
        query=request.question,
        top_k=request.top_k,
        matter_id=request.matter_id,
    )
    has_context, filtered_chunks = guardrails.check_retrieval_confidence(chunks)
    if not has_context or not filtered_chunks:
        answer_text = "Based on the provided documents, I could not find information regarding your query."
        final_answer = guardrails.sanitize_output(
            answer_text, include_disclaimer=True, mask_pii=request.mask_pii
        )
        return QueryResponse(
            answer=final_answer,
            sources=[],
            confidence=0.0,
            has_answer=False,
            matter_id=request.matter_id,
        )
    gen_result = response_generator.generate(
        query=request.question,
        context_chunks=filtered_chunks,
        matter_id=request.matter_id,
    )
    sanitized_answer = guardrails.sanitize_output(
        gen_result["answer"],
        include_disclaimer=True,
        mask_pii=request.mask_pii,
    )
    sources = (
        [SourceItem(**s) for s in gen_result["sources"]]
        if request.include_sources
        else []
    )
    return QueryResponse(
        answer=sanitized_answer,
        sources=sources,
        confidence=gen_result["confidence"],
        has_answer=gen_result["has_answer"],
        matter_id=request.matter_id,
    )


@router.post("/query/stream")
def query_stream(request: QueryRequest) -> StreamingResponse:
    logger.info(f"Incoming streaming query: '{request.question[:60]}'")
    chunks = retriever.search(
        query=request.question,
        top_k=request.top_k,
        matter_id=request.matter_id,
    )
    _, filtered_chunks = guardrails.check_retrieval_confidence(chunks)
    events = response_generator.generate_stream(
        query=request.question,
        context_chunks=filtered_chunks,
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


@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    matter_id: str | None = Form(default=None),
    metadata_json: str | None = Form(default=None),
) -> IngestResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")
    save_dir = settings.raw_data_dir
    save_path = save_dir / file.filename
    try:
        content = await file.read()
        save_path.write_bytes(content)
        logger.info(f"Saved uploaded file to {save_path}")
    except (OSError, RuntimeError) as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}") from e
    meta: dict[str, Any] = {}
    if metadata_json:
        try:
            meta = json.loads(metadata_json)
        except (json.JSONDecodeError, TypeError, ValueError):
            logger.warning("Could not parse metadata_json, using empty dict")
    if matter_id:
        meta["matter_id"] = matter_id
    result = ingestion_pipeline.ingest_document(
        save_path,
        metadata=meta,
        chunk_strategy=settings.chunk_strategy,
    )

    if result.get("status") == "success":
        return IngestResponse(
            status="success",
            document_id=file.filename,
            chunks_created=result.get("chunks_created", 0),
            matter_id=matter_id,
            message="Document ingested successfully.",
        )
    raise HTTPException(
        status_code=500,
        detail=result.get("reason", "Document ingestion failed."),
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
