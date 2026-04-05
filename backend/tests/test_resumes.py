"""
Integration tests for /resumes endpoints — CRUD, set-primary, get-primary.
"""
import pytest
from tests.conftest import _register_and_login


# ===================== CREATE =====================


@pytest.mark.asyncio
async def test_create_resume(client, auth_headers):
    """POST /resumes with minimal data returns 201."""
    resp = await client.post(
        "/resumes",
        json={"title": "My First Resume"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My First Resume"
    assert data["template"] == "modern"  # default
    assert data["is_primary"] is False


@pytest.mark.asyncio
async def test_create_resume_full_data(client, auth_headers):
    """Create with full structured data."""
    resp = await client.post(
        "/resumes",
        json={
            "title": "Full Resume",
            "template": "classic",
            "full_name": "John Doe",
            "email_contact": "john@example.com",
            "summary": "Experienced developer",
            "education": [
                {
                    "institution": "MIT",
                    "degree": "BSc",
                    "field": "CS",
                    "start_date": "2018",
                    "end_date": "2022",
                }
            ],
            "skills": {"technical": ["Python", "FastAPI"], "soft": ["Communication"]},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["full_name"] == "John Doe"
    assert len(data["education"]) == 1
    assert data["skills"]["technical"] == ["Python", "FastAPI"]


# ===================== LIST =====================


@pytest.mark.asyncio
async def test_list_resumes(client, auth_headers):
    """List returns all resumes for the user."""
    await client.post("/resumes", json={"title": "R1"}, headers=auth_headers)
    await client.post("/resumes", json={"title": "R2"}, headers=auth_headers)

    resp = await client.get("/resumes", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ===================== GET =====================


@pytest.mark.asyncio
async def test_get_resume(client, auth_headers):
    """GET /resumes/{id} returns the correct resume."""
    create_resp = await client.post("/resumes", json={"title": "Get Test"}, headers=auth_headers)
    rid = create_resp.json()["id"]

    resp = await client.get(f"/resumes/{rid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Get Test"


@pytest.mark.asyncio
async def test_get_resume_forbidden(client):
    """User B cannot access User A's resume."""
    _, _, headers_a = await _register_and_login(client, "resume_owner", "rowner@test.com")
    _, _, headers_b = await _register_and_login(client, "resume_other", "rother@test.com")

    create_resp = await client.post("/resumes", json={"title": "Private"}, headers=headers_a)
    rid = create_resp.json()["id"]

    resp = await client.get(f"/resumes/{rid}", headers=headers_b)
    assert resp.status_code == 403


# ===================== UPDATE =====================


@pytest.mark.asyncio
async def test_update_resume(client, auth_headers):
    """PUT /resumes/{id} updates the title."""
    create_resp = await client.post("/resumes", json={"title": "Old Title"}, headers=auth_headers)
    rid = create_resp.json()["id"]

    resp = await client.put(
        f"/resumes/{rid}",
        json={"title": "New Title"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


# ===================== DELETE =====================


@pytest.mark.asyncio
async def test_delete_resume(client, auth_headers):
    """DELETE /resumes/{id} removes the resume."""
    create_resp = await client.post("/resumes", json={"title": "Delete Me"}, headers=auth_headers)
    rid = create_resp.json()["id"]

    resp = await client.delete(f"/resumes/{rid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True


# ===================== SET PRIMARY =====================


@pytest.mark.asyncio
async def test_set_primary(client, auth_headers):
    """POST /resumes/{id}/set-primary sets is_primary=True."""
    create_resp = await client.post("/resumes", json={"title": "Primary"}, headers=auth_headers)
    rid = create_resp.json()["id"]

    resp = await client.post(f"/resumes/{rid}/set-primary", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_primary"] is True


@pytest.mark.asyncio
async def test_primary_uniqueness(client, auth_headers):
    """Only one resume can be primary — setting a new one unsets the old."""
    r1 = await client.post("/resumes", json={"title": "R1"}, headers=auth_headers)
    r2 = await client.post("/resumes", json={"title": "R2"}, headers=auth_headers)

    await client.post(f"/resumes/{r1.json()['id']}/set-primary", headers=auth_headers)
    await client.post(f"/resumes/{r2.json()['id']}/set-primary", headers=auth_headers)

    # R1 should no longer be primary
    resp_r1 = await client.get(f"/resumes/{r1.json()['id']}", headers=auth_headers)
    resp_r2 = await client.get(f"/resumes/{r2.json()['id']}", headers=auth_headers)

    assert resp_r1.json()["is_primary"] is False
    assert resp_r2.json()["is_primary"] is True


@pytest.mark.asyncio
async def test_get_primary_resume(client, auth_headers):
    """GET /resumes/primary returns the primary resume."""
    create_resp = await client.post("/resumes", json={"title": "Primary One"}, headers=auth_headers)
    rid = create_resp.json()["id"]
    await client.post(f"/resumes/{rid}/set-primary", headers=auth_headers)

    resp = await client.get("/resumes/primary", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == rid
    assert resp.json()["is_primary"] is True
