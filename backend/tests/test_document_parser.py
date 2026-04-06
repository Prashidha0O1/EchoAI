"""
Integration tests for DocumentParser — PDF and DOCX file parsing.

Generates real PDF and DOCX files at test time using reportlab and python-docx,
then verifies the parser extracts the expected text content.
"""
import os
import tempfile
import pytest

from app.services.document_parser import DocumentParser


# ─────────────────────────────────────────────────────────────────
# Helpers — create real PDF / DOCX files on disk
# ─────────────────────────────────────────────────────────────────

def _make_pdf(text: str) -> str:
    """Create a temporary PDF file containing the given text."""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.close()
    c = canvas.Canvas(tmp.name, pagesize=letter)
    y = 750
    for line in text.split("\n"):
        c.drawString(72, y, line)
        y -= 18
    c.save()
    return tmp.name


def _make_docx(text: str) -> str:
    """Create a temporary DOCX file containing the given text."""
    import docx as python_docx

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    tmp.close()
    doc = python_docx.Document()
    for line in text.split("\n"):
        doc.add_paragraph(line)
    doc.save(tmp.name)
    return tmp.name


# ─────────────────────────────────────────────────────────────────
# PDF parsing tests
# ─────────────────────────────────────────────────────────────────

class TestPdfParsing:
    def test_parse_pdf_extracts_text(self):
        """parse_pdf returns the text contained in a real PDF."""
        content = "John Doe\nPython Developer\nFastAPI Django React"
        path = _make_pdf(content)
        try:
            text = DocumentParser.parse_pdf(path)
            assert "John Doe" in text
            assert "Python Developer" in text
            assert "FastAPI" in text
        finally:
            os.unlink(path)

    def test_parse_pdf_nonexistent_file_returns_empty(self):
        """parse_pdf returns empty string when the file is missing."""
        result = DocumentParser.parse_pdf("C:/path/that/does/not/exist.pdf")
        assert result == ""

    def test_parse_pdf_corrupted_file_returns_empty(self):
        """parse_pdf returns empty string for a corrupted PDF."""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.write(b"this is not a real pdf")
        tmp.close()
        try:
            result = DocumentParser.parse_pdf(tmp.name)
            assert result == ""
        finally:
            os.unlink(tmp.name)


# ─────────────────────────────────────────────────────────────────
# DOCX parsing tests
# ─────────────────────────────────────────────────────────────────

class TestDocxParsing:
    def test_parse_docx_extracts_text(self):
        """parse_docx returns the text contained in a real DOCX."""
        content = "Jane Smith\nSenior Engineer\nKubernetes Docker AWS"
        path = _make_docx(content)
        try:
            text = DocumentParser.parse_docx(path)
            assert "Jane Smith" in text
            assert "Senior Engineer" in text
            assert "Kubernetes" in text
        finally:
            os.unlink(path)

    def test_parse_docx_nonexistent_file_returns_empty(self):
        """parse_docx returns empty string when the file is missing."""
        result = DocumentParser.parse_docx("C:/path/that/does/not/exist.docx")
        assert result == ""

    def test_parse_docx_corrupted_file_returns_empty(self):
        """parse_docx returns empty string for a corrupted DOCX."""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
        tmp.write(b"this is not a real docx")
        tmp.close()
        try:
            result = DocumentParser.parse_docx(tmp.name)
            assert result == ""
        finally:
            os.unlink(tmp.name)


# ─────────────────────────────────────────────────────────────────
# parse_document — auto-detection by extension
# ─────────────────────────────────────────────────────────────────

class TestParseDocumentAutoDetection:
    def test_auto_detect_pdf(self):
        path = _make_pdf("Auto-detect PDF test content")
        try:
            text = DocumentParser.parse_document(path)
            assert "Auto-detect PDF test content" in text
        finally:
            os.unlink(path)

    def test_auto_detect_docx(self):
        path = _make_docx("Auto-detect DOCX test content")
        try:
            text = DocumentParser.parse_document(path)
            assert "Auto-detect DOCX test content" in text
        finally:
            os.unlink(path)

    def test_unsupported_extension_returns_empty(self):
        """parse_document returns '' for unsupported file types like .txt."""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
        tmp.write(b"plain text content")
        tmp.close()
        try:
            assert DocumentParser.parse_document(tmp.name) == ""
        finally:
            os.unlink(tmp.name)

    def test_unsupported_image_returns_empty(self):
        """parse_document returns '' for image files like .jpg."""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        tmp.write(b"fake image bytes")
        tmp.close()
        try:
            assert DocumentParser.parse_document(tmp.name) == ""
        finally:
            os.unlink(tmp.name)


# ─────────────────────────────────────────────────────────────────
# Async wrapper test
# ─────────────────────────────────────────────────────────────────

class TestParseDocumentAsync:
    @pytest.mark.asyncio
    async def test_async_pdf(self):
        path = _make_pdf("Async PDF parsing test")
        try:
            text = await DocumentParser.parse_document_async(path)
            assert "Async PDF parsing test" in text
        finally:
            os.unlink(path)

    @pytest.mark.asyncio
    async def test_async_docx(self):
        path = _make_docx("Async DOCX parsing test")
        try:
            text = await DocumentParser.parse_document_async(path)
            assert "Async DOCX parsing test" in text
        finally:
            os.unlink(path)
