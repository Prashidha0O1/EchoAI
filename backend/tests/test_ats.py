"""
Integration tests for /ats/check endpoint — ATS resume scoring.
AI services (BERT model, DocumentParser) are mocked.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def _get_ats_mocks():
    """Return patchers for ATS service and document parser."""
    mock_ats = MagicMock()
    mock_ats.is_loaded = True
    mock_ats.compute_ats_score_async = AsyncMock(return_value={"percentage": 72.5})
    mock_ats.analyze_resume_gaps = MagicMock(return_value={
        "missing_keywords": ["docker", "kubernetes"],
        "recommendations": ["Add containerization experience"],
        "feedback": ["Strong Python skills detected"],
    })

    return (
        patch("routers.ats.get_ats_service", return_value=mock_ats),
        patch("routers.ats.DocumentParser.parse_document_async", new_callable=AsyncMock, return_value="Experienced Python developer with 5 years..."),
        mock_ats,
    )


@pytest.mark.asyncio
async def test_ats_check_success(client, auth_headers):
    """Upload PDF + JD returns 200 with percentage, missing_keywords, recommendations, feedback."""
    ats_patch, parser_patch, _ = _get_ats_mocks()

    with ats_patch, parser_patch:
        fake_pdf = b"%PDF-1.0 test resume content"
        resp = await client.post(
            "/ats/check",
            headers=auth_headers,
            data={"job_description": "Looking for a Python developer with Docker experience"},
            files={"resume": ("resume.pdf", fake_pdf, "application/pdf")},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["percentage"] == 72.5
    assert "docker" in data["missing_keywords"]
    assert len(data["recommendations"]) > 0
    assert len(data["feedback"]) > 0


@pytest.mark.asyncio
async def test_ats_check_invalid_file_type(client, auth_headers):
    """Uploading a .txt file returns 400."""
    resp = await client.post(
        "/ats/check",
        headers=auth_headers,
        data={"job_description": "Some job description"},
        files={"resume": ("resume.txt", b"plain text resume", "text/plain")},
    )
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_ats_check_empty_jd(client, auth_headers):
    """Empty job description returns 400."""
    ats_patch, parser_patch, _ = _get_ats_mocks()

    with ats_patch, parser_patch:
        fake_pdf = b"%PDF-1.0 test"
        resp = await client.post(
            "/ats/check",
            headers=auth_headers,
            data={"job_description": "   "},  # whitespace-only
            files={"resume": ("resume.pdf", fake_pdf, "application/pdf")},
        )

    assert resp.status_code == 400
    assert "must not be empty" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_ats_model_not_loaded(client, auth_headers):
    """When ATS model is not loaded, returns 503."""
    mock_ats = MagicMock()
    mock_ats.is_loaded = False

    with (
        patch("routers.ats.get_ats_service", return_value=mock_ats),
        patch("routers.ats.DocumentParser.parse_document_async", new_callable=AsyncMock, return_value="Some resume text"),
    ):
        fake_pdf = b"%PDF-1.0 test"
        resp = await client.post(
            "/ats/check",
            headers=auth_headers,
            data={"job_description": "Python developer"},
            files={"resume": ("resume.pdf", fake_pdf, "application/pdf")},
        )

    assert resp.status_code == 503
    assert "not available" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_ats_unauthenticated(client):
    """POST /ats/check without token returns 401."""
    fake_pdf = b"%PDF-1.0 test"
    resp = await client.post(
        "/ats/check",
        data={"job_description": "Some JD"},
        files={"resume": ("resume.pdf", fake_pdf, "application/pdf")},
    )
    assert resp.status_code == 401
