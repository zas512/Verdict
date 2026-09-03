#!/usr/bin/env python3
"""Evaluation script for the Legal RAG system."""

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.evals.metrics import evaluator
from src.generation.llm import response_generator
from src.guardrails.filters import guardrails
from src.logger import logger
from src.retrieval.retriever import retriever

TEST_CASES = [
    {
        "query": "What are the confidentiality obligations of the Receiving Party?",
        "ground_truth": "The Receiving Party shall hold the Confidential Information in confidence and not disclose without prior written consent.",
    },
    {
        "query": "What is the hourly rate for legal research services?",
        "ground_truth": "Client shall pay Service Provider a fee of $500 per hour.",
    },
    {
        "query": "What is the governing law for the confidentiality agreement?",
        "ground_truth": "The Agreement shall be governed by the laws of the State of Delaware.",
    },
]


def run_evaluation() -> None:
    logger.info("Running Legal RAG Evaluation Suite...")
    total_faithfulness = 0.0
    total_relevance = 0.0
    passed_count = 0

    for i, test in enumerate(TEST_CASES, 1):
        q = test["query"]
        gt = test.get("ground_truth")
        logger.info(f"\n--- [Test Case {i}] Query: {q} ---")

        chunks = retriever.search(q, top_k=3)
        has_context, valid_chunks = guardrails.check_retrieval_confidence(chunks)

        if not has_context:
            logger.warning("No confident context retrieved.")
            continue

        gen_result = response_generator.generate(q, valid_chunks)
        answer = gen_result["answer"]

        logger.info(f"Answer: {answer[:120]}...")
        eval_res = evaluator.evaluate(
            query=q,
            answer=answer,
            context_chunks=valid_chunks,
            ground_truth=gt,
        )

        total_faithfulness += eval_res.faithfulness
        total_relevance += eval_res.relevance
        if eval_res.passed:
            passed_count += 1

    count = max(1, len(TEST_CASES))
    logger.info("\n================ EVALUATION SUMMARY ================")
    logger.info(f"Passed: {passed_count}/{len(TEST_CASES)}")
    logger.info(f"Avg Faithfulness: {total_faithfulness / count:.2f}")
    logger.info(f"Avg Relevance: {total_relevance / count:.2f}")


if __name__ == "__main__":
    run_evaluation()
