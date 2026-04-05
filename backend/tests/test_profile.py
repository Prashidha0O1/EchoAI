"""
Integration tests for /profile endpoints — get, update, CV upload/delete, picture upload.
"""
import pytest


# ===================== GET PROFILE =====================


@pytest.mark.asyncio
async def test_get_profile(client, auth_headers):
    """GET /profile returns the user's profile."""
    resp = await client.get("/profile", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "user_id" in data
    assert "bio" in data


@pytest.mark.asyncio
async def test_get_profile_unauthenticated(client):
    """GET /profile without token returns 401."""
    resp = await client.get("/profile")
    assert resp.status_code == 401


# ===================== UPDATE PROFILE =====================


@pytest.mark.asyncio
async def test_update_profile_bio(client, auth_headers):
    """PATCH /profile with bio updates it."""
    resp = await client.patch(
        "/profile",
        json={"bio": "Hello, I am a test user!"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["bio"] == "Hello, I am a test user!"


# ===================== CV UPLOAD =====================


@pytest.mark.asyncio
async def test_upload_cv_pdf(client, auth_headers):
    """POST /profile/cv with a PDF file succeeds."""
    fake_pdf = b"%PDF-1.0 test content for unit test"
    resp = await client.post(
        "/profile/cv",
        headers=auth_headers,
        files={"cv_file": ("resume.pdf", fake_pdf, "application/pdf")},
    )
    assert resp.status_code == 200
    assert resp.json()["cv_file_path"] is not None


@pytest.mark.asyncio
async def test_upload_cv_invalid_type(client, auth_headers):
    """Uploading a .exe file returns 400."""
    resp = await client.post(
        "/profile/cv",
        headers=auth_headers,
        files={"cv_file": ("malware.exe", b"MZ...", "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "Invalid file type" in resp.json()["detail"]


# ===================== DELETE CV =====================


@pytest.mark.asyncio
async def test_delete_cv(client, auth_headers):
    """Upload then DELETE /profile/cv succeeds."""
    fake_pdf = b"%PDF-1.0 test"
    await client.post(
        "/profile/cv",
        headers=auth_headers,
        files={"cv_file": ("resume.pdf", fake_pdf, "application/pdf")},
    )

    resp = await client.delete("/profile/cv", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True


# ===================== PROFILE PICTURE =====================


@pytest.mark.asyncio
async def test_upload_profile_picture(client, auth_headers):
    """POST /profile/picture with a PNG file succeeds."""
    # Minimal PNG header
    fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    resp = await client.post(
        "/profile/picture",
        headers=auth_headers,
        files={"picture": ("photo.png", fake_png, "image/png")},
    )
    assert resp.status_code == 200
    assert resp.json()["profile_picture"] is not None
