"""
Black-box API tests for EchoAI backend.

These tests treat the API as an opaque HTTP service — they ONLY examine:
  - HTTP status codes
  - JSON response shapes (key presence, types)
  - Response headers

They NEVER reference internal models, schemas, or database state.
"""
import pytest


# ===================== HELPERS =====================


async def _bb_register(client, username="bbuser", email="bb@test.com", password="BlackBox1!"):
    """Register a user via the API."""
    return await client.post(
        "/auth/register",
        data={"username": username, "email": email, "password": password},
    )


async def _bb_login(client, email="bb@test.com", password="BlackBox1!"):
    """Login and return the auth headers."""
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ===================== 1. FULL AUTH FLOW =====================


@pytest.mark.asyncio
async def test_bb_full_auth_flow(client):
    """Register -> Login -> GET /me -> verify the chain works end-to-end."""
    reg = await _bb_register(client, "flowuser", "flow@test.com")
    assert reg.status_code == 200

    login = await client.post("/auth/login", data={"username": "flow@test.com", "password": "BlackBox1!"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "flow@test.com"


# ===================== 2. REGISTER RESPONSE SHAPE =====================


@pytest.mark.asyncio
async def test_bb_register_response_shape(client):
    """Verify the register response has the expected keys."""
    resp = await _bb_register(client, "shapeuser", "shape@test.com")
    assert resp.status_code == 200
    data = resp.json()

    expected_keys = {"id", "username", "email", "is_admin", "is_active", "email_verified", "created_at"}
    assert expected_keys.issubset(data.keys()), f"Missing keys: {expected_keys - data.keys()}"
    assert isinstance(data["id"], int)
    assert isinstance(data["is_admin"], bool)


# ===================== 3. LOGIN RESPONSE SHAPE =====================


@pytest.mark.asyncio
async def test_bb_login_response_shape(client):
    """Verify the login response has access_token and token_type."""
    await _bb_register(client, "loginshape", "loginshape@test.com")
    resp = await client.post("/auth/login", data={"username": "loginshape@test.com", "password": "BlackBox1!"})

    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 10


# ===================== 4. INVALID TOKEN =====================


@pytest.mark.asyncio
async def test_bb_invalid_token_401(client):
    """Random bearer token on /auth/me returns 401."""
    resp = await client.get("/auth/me", headers={"Authorization": "Bearer totally.invalid.jwt"})
    assert resp.status_code == 401


# ===================== 5. INTERVIEW LIFECYCLE =====================


@pytest.mark.asyncio
async def test_bb_interview_lifecycle(client):
    """Create -> Start -> End interview, verify status transitions."""
    await _bb_register(client, "lifecycle", "lifecycle@test.com")
    headers = await _bb_login(client, "lifecycle@test.com")

    # Create
    create = await client.post("/interviews", json={"interview_type": "technical"}, headers=headers)
    assert create.status_code == 201
    iid = create.json()["id"]
    assert create.json()["status"] == "pending"

    # Start
    start = await client.post(f"/interviews/{iid}/start", headers=headers)
    assert start.status_code == 200
    assert start.json()["status"] == "in_progress"

    # End
    end = await client.post(f"/interviews/{iid}/end", headers=headers)
    assert end.status_code == 200
    assert end.json()["status"] == "completed"


# ===================== 6. INTERVIEW RESPONSE SHAPE =====================


@pytest.mark.asyncio
async def test_bb_interview_response_shape(client):
    """Verify all InterviewOut fields are present."""
    await _bb_register(client, "intshape", "intshape@test.com")
    headers = await _bb_login(client, "intshape@test.com")

    resp = await client.post(
        "/interviews",
        json={"interview_type": "behavioral", "role": "SWE", "experience_level": "junior"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()

    expected = {"id", "user_id", "interview_type", "status", "created_at"}
    assert expected.issubset(data.keys())


# ===================== 7. INTERVIEW ISOLATION =====================


@pytest.mark.asyncio
async def test_bb_interview_isolation(client):
    """Two users cannot access each other's interviews."""
    await _bb_register(client, "iso_a", "iso_a@test.com")
    await _bb_register(client, "iso_b", "iso_b@test.com")
    headers_a = await _bb_login(client, "iso_a@test.com")
    headers_b = await _bb_login(client, "iso_b@test.com")

    create = await client.post("/interviews", json={"interview_type": "hr"}, headers=headers_a)
    iid = create.json()["id"]

    resp = await client.get(f"/interviews/{iid}", headers=headers_b)
    assert resp.status_code == 403


# ===================== 8. PROFILE AFTER REGISTER =====================


@pytest.mark.asyncio
async def test_bb_profile_after_register(client):
    """GET /profile immediately after register returns 200."""
    await _bb_register(client, "profuser", "profuser@test.com")
    headers = await _bb_login(client, "profuser@test.com")

    resp = await client.get("/profile", headers=headers)
    assert resp.status_code == 200
    assert "user_id" in resp.json()


# ===================== 9. RESUME CRUD CYCLE =====================


@pytest.mark.asyncio
async def test_bb_resume_crud_cycle(client):
    """Create -> GET -> PUT (update title) -> DELETE."""
    await _bb_register(client, "rescrud", "rescrud@test.com")
    headers = await _bb_login(client, "rescrud@test.com")

    # Create
    create = await client.post("/resumes", json={"title": "Original"}, headers=headers)
    assert create.status_code == 201
    rid = create.json()["id"]

    # Read
    get = await client.get(f"/resumes/{rid}", headers=headers)
    assert get.status_code == 200
    assert get.json()["title"] == "Original"

    # Update
    put = await client.put(f"/resumes/{rid}", json={"title": "Updated"}, headers=headers)
    assert put.status_code == 200
    assert put.json()["title"] == "Updated"

    # Delete
    delete = await client.delete(f"/resumes/{rid}", headers=headers)
    assert delete.status_code == 200
    assert delete.json()["success"] is True


# ===================== 10. RESUME PRIMARY TOGGLE =====================


@pytest.mark.asyncio
async def test_bb_resume_primary_toggle(client):
    """Set primary, GET /resumes/primary returns it."""
    await _bb_register(client, "primary_bb", "primary_bb@test.com")
    headers = await _bb_login(client, "primary_bb@test.com")

    create = await client.post("/resumes", json={"title": "Primary BB"}, headers=headers)
    rid = create.json()["id"]

    await client.post(f"/resumes/{rid}/set-primary", headers=headers)

    resp = await client.get("/resumes/primary", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == rid
    assert resp.json()["is_primary"] is True


# ===================== 11. 404 MISSING RESOURCE =====================


@pytest.mark.asyncio
async def test_bb_404_missing_resource(client):
    """GET /interviews/99999 returns 404 with detail field."""
    await _bb_register(client, "miss404", "miss404@test.com")
    headers = await _bb_login(client, "miss404@test.com")

    resp = await client.get("/interviews/99999", headers=headers)
    assert resp.status_code == 404
    assert "detail" in resp.json()


# ===================== 12. 422 INVALID INPUT =====================


@pytest.mark.asyncio
async def test_bb_422_invalid_input(client):
    """POST /interviews with invalid type returns 422."""
    await _bb_register(client, "invalid422", "invalid422@test.com")
    headers = await _bb_login(client, "invalid422@test.com")

    resp = await client.post("/interviews", json={"interview_type": "garbage"}, headers=headers)
    assert resp.status_code == 422


# ===================== 13. HEALTH ENDPOINT =====================


@pytest.mark.asyncio
async def test_bb_health_endpoint(client):
    """GET /health returns 200 with status field."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data


# ===================== 14. ROOT ENDPOINT =====================


@pytest.mark.asyncio
async def test_bb_root_endpoint(client):
    """GET / returns 200 with a welcome message."""
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data


# ===================== 15. PROTECTED ENDPOINTS REJECT ANON =====================


@pytest.mark.asyncio
async def test_bb_protected_endpoints_reject_anon(client):
    """Multiple protected endpoints return 401 without a token."""
    endpoints = [
        ("GET", "/auth/me"),
        ("GET", "/interviews"),
        ("POST", "/interviews"),
        ("GET", "/profile"),
        ("GET", "/resumes"),
        ("GET", "/leaderboard"),
    ]

    for method, path in endpoints:
        if method == "GET":
            resp = await client.get(path)
        else:
            resp = await client.post(path, json={})
        assert resp.status_code == 401, f"{method} {path} should return 401, got {resp.status_code}"
