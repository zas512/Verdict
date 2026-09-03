#!/usr/bin/env python3
"""Seed the RAG system with sample legal documents."""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config import settings
from src.ingestion.chunker import chunk_documents
from src.ingestion.loader import load_documents
from src.logger import logger


def create_sample_documents() -> None:
    """Create sample legal documents for testing."""
    sample_dir = settings.raw_data_dir
    sample_dir.mkdir(parents=True, exist_ok=True)

    # Sample NDA
    nda_content = """CONFIDENTIALITY AGREEMENT

This Confidentiality Agreement (the "Agreement") is entered into on this 1st day of January, 2024 (the "Effective Date") by and between:

ABC Corporation, a Delaware corporation, with its principal place of business at 123 Main Street, Wilmington, DE 19801 ("Disclosing Party")

AND

XYZ Technologies, Inc., a California corporation, with its principal place of business at 456 Tech Drive, San Francisco, CA 94105 ("Receiving Party")

1. DEFINITIONS

1.1 "Confidential Information" means any information disclosed by the Disclosing Party to the Receiving Party, either directly or indirectly, in writing, orally, or by drawings or observation of parts or equipment, that is designated as "Confidential," "Proprietary," or some similar designation.

1.2 "Trade Secrets" means information that derives independent economic value from not being generally known to the public and is the subject of reasonable efforts to maintain its secrecy.

2. OBLIGATIONS OF RECEIVING PARTY

2.1 The Receiving Party shall hold the Confidential Information in confidence and shall not disclose such Confidential Information to any third party without the prior written consent of the Disclosing Party.

2.2 The Receiving Party shall use the Confidential Information solely for the purpose of evaluating a potential business relationship with the Disclosing Party.

3. EXCLUSIONS

3.1 Information that is or becomes publicly available through no fault of the Receiving Party.

3.2 Information that was in the Receiving Party's possession prior to disclosure by the Disclosing Party.

4. TERM

This Agreement shall remain in effect for a period of three (3) years from the Effective Date, unless terminated earlier by either party upon thirty (30) days' written notice.

5. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

ABC Corporation
By: _____________________
Name: John Smith
Title: CEO

XYZ Technologies, Inc.
By: _____________________
Name: Jane Doe
Title: CTO
"""

    # Sample Contract
    contract_content = """SERVICE AGREEMENT

THIS SERVICE AGREEMENT (the "Agreement") is made on January 15, 2024, by and between:

Legal Solutions Inc. ("Service Provider")
123 Legal Lane, Suite 400, New York, NY 10001

AND

Client Name ("Client")
789 Business Blvd, Los Angeles, CA 90001

1. SERVICES

1.1 Service Provider shall provide legal research services as requested by Client.

1.2 Service Provider shall assign qualified attorneys to perform the Services.

2. PAYMENT

2.1 Client shall pay Service Provider a fee of $500 per hour for Services rendered.

2.2 Invoices shall be submitted monthly and are due within thirty (30) days of receipt.

3. CONFIDENTIALITY

Service Provider shall maintain the confidentiality of all Client information and shall not disclose any Client information to third parties without Client's prior written consent.

4. LIABILITY

Service Provider's total liability under this Agreement shall not exceed the total fees paid by Client during the twelve (12) months preceding the claim.

5. TERMINATION

Either party may terminate this Agreement upon thirty (30) days' written notice to the other party.

6. DISPUTE RESOLUTION

Any dispute arising under this Agreement shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.

IN WITNESS WHEREOF, the parties have executed this Agreement.

Service Provider
By: _____________________
Date: ___________________

Client
By: _____________________
Date: ___________________
"""

    # Save sample documents
    sample_files: list[tuple[Path, str]] = [
        (sample_dir / "nda_sample.txt", nda_content),
        (sample_dir / "service_agreement_sample.txt", contract_content),
    ]

    for file_path, content in sample_files:
        if not file_path.exists():
            file_path.write_text(content, encoding="utf-8")
            logger.info(f"✅ Created sample document: {file_path.name}")
        else:
            logger.info(f"⏭️ Sample document already exists: {file_path.name}")


def main() -> None:
    """Main seeding function."""
    logger.info("🌱 Seeding RAG system with sample documents...")

    # Create sample documents
    create_sample_documents()

    # Load documents
    logger.info("📄 Loading documents...")
    documents = load_documents(settings.raw_data_dir)

    if not documents:
        logger.warning("No documents found to process.")
        return

    # Chunk documents
    logger.info("🔪 Chunking documents...")
    chunks = chunk_documents(documents, strategy="sentence")

    # Display statistics
    logger.info("📊 Statistics:")
    logger.info(f"  - Total documents: {len(documents)}")
    logger.info(f"  - Total chunks: {len(chunks)}")
    if chunks:
        avg_size = sum(len(c.text) for c in chunks) / len(chunks)
        logger.info(f"  - Average chunk size: {avg_size:.0f} chars")

        # Show first chunk preview
        preview = chunks[0].text[:200].replace("\n", " ")
        logger.info(f"\n📝 First chunk preview:\n{preview}...")

    logger.info("✅ Seeding complete!")


if __name__ == "__main__":
    main()
