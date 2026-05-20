"""
Document Parser — High-fidelity extraction for PDF and DOCX files.
"""

from __future__ import annotations
import logging
import io
from typing import Optional

logger = logging.getLogger(__name__)

async def parse_document(file_content: bytes, file_name: str) -> Optional[str]:
    """Detect file type and extract text content."""
    try:
        if file_name.lower().endswith('.pdf'):
            return await _parse_pdf(file_content)
        elif file_name.lower().endswith('.docx'):
            return await _parse_docx(file_content)
        return None
    except Exception as e:
        logger.error(f"Failed to parse document {file_name}: {e}")
        return None

async def _parse_pdf(content: bytes) -> str:
    """Extract text from PDF using PyMuPDF."""
    import fitz # PyMuPDF
    text = ""
    with fitz.open(stream=content, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()

async def _parse_docx(content: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    from docx import Document
    f = io.BytesIO(content)
    doc = Document(f)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text).strip()
