"""
Integration tests for /interviews endpoints — CRUD, start, end, messages.
"""
import pytest
from tests.conftest import _register_and_login


# ===================== CREATE =====================


@pytest.mark.asyncio
async def test_create_interview(client, auth_headers):
    """POST /interviews with valid data returns 201."""
    resp = await client.post(
        "/interviews",
        json={"interview_type": "technical"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["interview_type"] == "technical"
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_with_jd(client, auth_headers):
    """Create with job_description stores it."""
    resp = await client.post(
        "/interviews",
        json={
            "interview_type": "behavioral",
            "job_description": "Software Engineer at Google",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["job_description"] == "Software Engineer at Google"


@pytest.mark.asyncio
async def test_create_invalid_type(client, auth_headers):
    """Invalid interview_type returns 422."""
    resp = await client.post(
        "/interviews",
        json={"interview_type": "invalid_type"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_unauthenticated(client):
    """POST /interviews without token returns 401."""
    resp = await client.post("/interviews", json={"interview_type": "technical"})
    assert resp.status_code == 401


# ===================== LIST =====================


@pytest.mark.asyncio
async def test_list_interviews(client, auth_headers):
    """List returns all interviews for the current user."""
    for _ in range(3):
        await client.post("/interviews", json={"interview_type": "technical"}, headers=auth_headers)

    resp = await client.get("/interviews", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3


@pytest.mark.asyncio
async def test_list_only_own(client):
    """Users only see their own interviews."""
    _, _, headers_a = await _register_and_login(client, "usera", "a@test.com")
    _, _, headers_b = await _register_and_login(client, "userb", "b@test.com")

    await client.post("/interviews", json={"interview_type": "technical"}, headers=headers_a)
    await client.post("/interviews", json={"interview_type": "technical"}, headers=headers_a)
    await client.post("/interviews", json={"interview_type": "behavioral"}, headers=headers_b)

    resp_a = await client.get("/interviews", headers=headers_a)
    resp_b = await client.get("/interviews", headers=headers_b)

    assert len(resp_a.json()) == 2
    assert len(resp_b.json()) == 1


# ===================== GET =====================


@pytest.mark.asyncio
async def test_get_interview(client, auth_headers):
    """GET /interviews/{id} returns the correct interview."""
    create_resp = await client.post(
        "/interviews", json={"interview_type": "hr"}, headers=auth_headers
    )
    iid = create_resp.json()["id"]

    resp = await client.get(f"/interviews/{iid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == iid


@pytest.mark.asyncio
async def test_get_not_found(client, auth_headers):
    """GET /interviews/99999 returns 404."""
    resp = await client.get("/interviews/99999", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_forbidden(client):
    """User A cannot access User B's interview."""
    _, _, headers_a = await _register_and_login(client, "ownerx", "ownerx@test.com")
    _, _, headers_b = await _register_and_login(client, "otherx", "otherx@test.com")

    create_resp = await client.post(
        "/interviews", json={"interview_type": "technical"}, headers=headers_a
    )
    iid = create_resp.json()["id"]

    resp = await client.get(f"/interviews/{iid}", headers=headers_b)
    assert resp.status_code == 403


# ===================== START / END =====================


@pytest.mark.asyncio
async def test_start_interview(client, auth_headers):
    """POST /interviews/{id}/start changes status to in_progress."""
    create_resp = await client.post(
        "/interviews", json={"interview_type": "technical"}, headers=auth_headers
    )
    iid = create_resp.json()["id"]

    resp = await client.post(f"/interviews/{iid}/start", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"
    assert resp.json()["started_at"] is not None


@pytest.mark.asyncio
async def test_start_already_started(client, auth_headers):
    """Starting an in_progress interview returns 400."""
    create_resp = await client.post(
        "/interviews", json={"interview_type": "technical"}, headers=auth_headers
    )
    iid = create_resp.json()["id"]

    await client.post(f"/interviews/{iid}/start", headers=auth_headers)
    resp = await client.post(f"/interviews/{iid}/start", headers=auth_headers)
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_end_interview(client, auth_headers):
    """End an in_progress interview — status becomes completed."""
    create_resp = await client.post(
        "/interviews", json={"interview_type": "technical"}, headers=auth_headers
    )
    iid = create_resp.json()["id"]

    await client.post(f"/interviews/{iid}/start", headers=auth_headers)
    resp = await client.post(f"/interviews/{iid}/end", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"
    assert resp.json()["completed_at"] is not None


@pytest.mark.asyncio
async def test_end_not_started(client, auth_headers):
    """Ending a pending interview returns 400."""
    create_resp = await client.post(
        "/interviews", json={"interview_type": "technical"}, headers=auth_headers
    )
    iid = create_resp.json()["id"]

    resp = await client.post(f"/interviews/{iid}/end", headers=auth_headers)
    assert resp.status_code == 400
    assert "not in progress" in resp.json()["detail"].lower()


# ===================== DELETE =====================


@pytest.mark.asyncio
async def test_delete_interview(client, auth_headers):
    """DELETE removes the interview — subsequent GET returns 404."""
    create_resp = await client.post(
        "/interviews", json={"interview_type": "technical"}, headers=auth_headers
    )
    iid = create_resp.json()["id"]

    del_resp = await client.delete(f"/interviews/{iid}", headers=auth_headers)
    assert del_resp.status_code == 204

    get_resp = await client.get(f"/interviews/{iid}", headers=auth_headers)
    assert get_resp.status_code == 404
