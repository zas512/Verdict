import re
from dataclasses import dataclass
from typing import Any

from src.logger import logger


@dataclass
class EvaluationResult:
    query: str
    faithfulness: float
    relevance: float
    context_recall: float | None = None
    passed: bool = True
    metadata: dict[str, Any] | None = None


class RAGEvaluator:
    """Evaluates RAG pipeline responses for faithfulness, relevance, and recall."""

    @staticmethod
    def calculate_faithfulness(
        answer: str, context_chunks: list[dict[str, Any]]
    ) -> float:
        """Heuristic check of answer tokens supported by context excerpts."""
        if not context_chunks:
            return 0.0
        context_text = " ".join(c.get("chunk_text", "") for c in context_chunks).lower()
        answer_words = set(re.findall(r"\b[a-zA-Z]{4,}\b", answer.lower()))
        if not answer_words:
            return 1.0

        supported_words = sum(1 for word in answer_words if word in context_text)
        score = supported_words / len(answer_words)
        return round(min(1.0, score), 2)

    @staticmethod
    def calculate_relevance(query: str, answer: str) -> float:
        """Heuristic relevance check between question and answer."""
        query_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", query.lower()))
        if not query_words:
            return 1.0
        answer_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", answer.lower()))
        overlap = query_words.intersection(answer_words)
        score = len(overlap) / len(query_words)
        return round(min(1.0, score), 2)

    @classmethod
    def evaluate(
        cls,
        query: str,
        answer: str,
        context_chunks: list[dict[str, Any]],
        ground_truth: str | None = None,
    ) -> EvaluationResult:
        faithfulness = cls.calculate_faithfulness(answer, context_chunks)
        relevance = cls.calculate_relevance(query, answer)

        recall = None
        if ground_truth:
            gt_words = set(re.findall(r"\b[a-zA-Z]{4,}\b", ground_truth.lower()))
            ctx_text = " ".join(c.get("chunk_text", "") for c in context_chunks).lower()
            if gt_words:
                matched_gt = sum(1 for w in gt_words if w in ctx_text)
                recall = round(matched_gt / len(gt_words), 2)

        passed = faithfulness >= 0.6 and relevance >= 0.3
        logger.info(
            f"Evaluation: Faithfulness={faithfulness}, Relevance={relevance}, Passed={passed}"
        )
        return EvaluationResult(
            query=query,
            faithfulness=faithfulness,
            relevance=relevance,
            context_recall=recall,
            passed=passed,
        )


evaluator = RAGEvaluator()
