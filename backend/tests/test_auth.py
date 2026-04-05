"""
Integration tests for /auth endpoints — register, login, me, forgot/reset password.
"""
import pytest
from unittest.mock import AsyncMock, patch


# ===================== REGISTER =====================


@pytest.mark.asyncio
async def test_register_success(client):
    """POST /auth/register with valid data returns 200 and user object."""
    resp = await client.post(
        "/auth/register",
        data={
            "username": "newuser",
            "email": "new@example.com",
            "password": "SecurePass1!",
            "first_name": "John",
            "last_name": "Doe",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@example.com"
    assert data["is_admin"] is False
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    """Registering with an already-used email returns 400."""
    payload = {"username": "user1", "email": "dup@example.com", "password": "SecurePass1!"}
    await client.post("/auth/register", data=payload)

    payload["username"] = "user2"  # different username, same email
    resp = await client.post("/auth/register", data=payload)
    assert resp.status_code == 400
    assert "Email already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    """Registering with an already-used username returns 400."""
    payload = {"username": "sameuser", "email": "first@example.com", "password": "SecurePass1!"}
    await client.post("/auth/register", data=payload)

    payload["email"] = "second@example.com"  # different email, same username
    resp = await client.post("/auth/register", data=payload)
    assert resp.status_code == 400
    assert "Username already taken" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_short_password(client):
    """Password shorter than 8 chars returns 400."""
    resp = await client.post(
        "/auth/register",
        data={"username": "short", "email": "short@example.com", "password": "abc"},
    )
    assert resp.status_code == 400
    assert "at least 8 characters" in resp.json()["detail"]


# ===================== LOGIN =====================


@pytest.mark.asyncio
async def test_login_success(client):
    """Login with valid credentials returns access_token."""
    await client.post(
        "/auth/register",
        data={"username": "loginuser", "email": "login@example.com", "password": "SecurePass1!"},
    )

    resp = await client.post(
        "/auth/login",
        data={"username": "login@example.com", "password": "SecurePass1!"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # Token should be a non-empty JWT string
    assert len(data["access_token"]) > 20


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Login with incorrect password returns 401."""
    await client.post(
        "/auth/register",
        data={"username": "wrongpw", "email": "wrongpw@example.com", "password": "SecurePass1!"},
    )

    resp = await client.post(
        "/auth/login",
        data={"username": "wrongpw@example.com", "password": "WrongPassword!"},
    )
    assert resp.status_code == 401
    assert "Incorrect email or password" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    """Login with unknown email returns 401."""
    resp = await client.post(
        "/auth/login",
        data={"username": "nobody@example.com", "password": "DoesntMatter1!"},
    )
    assert resp.status_code == 401


# ===================== GET /auth/me =====================


@pytest.mark.asyncio
async def test_get_me_authenticated(client, test_user):
    """GET /auth/me with valid token returns user data."""
    _, _, headers = test_user
    resp = await client.get("/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    """GET /auth/me without Authorization header returns 401."""
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client):
    """GET /auth/me with garbage token returns 401."""
    resp = await client.get("/auth/me", headers={"Authorization": "Bearer invalid.garbage.token"})
    assert resp.status_code == 401


# ===================== JWT VALIDATION — EXPIRED & TAMPERED =====================


@pytest.mark.asyncio
async def test_expired_token_rejected(client):
    """A JWT token that has already expired is rejected with 401."""
    from datetime import timedelta
    from database.auth import create_access_token

    # Register a user so the email exists in DB
    await client.post(
        "/auth/register",
        data={"username": "expuser", "email": "exp@example.com", "password": "SecurePass1!"},
    )

    # Create a token that expired 1 hour ago
    expired_token = create_access_token(
        data={"sub": "exp@example.com", "user_id": 1},
        expires_delta=timedelta(hours=-1),
    )

    resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401
    assert "Could not validate credentials" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_tampered_token_rejected(client, test_user):
    """A valid JWT token with tampered payload/signature is rejected with 401."""
    _, token, _ = test_user

    # Tamper with the token by flipping characters in the signature (last part)
    parts = token.split(".")
    assert len(parts) == 3, "JWT should have 3 parts: header.payload.signature"

    # Corrupt the signature
    sig = parts[2]
    tampered_sig = sig[:-4] + ("AAAA" if not sig.endswith("AAAA") else "BBBB")
    tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"

    resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert resp.status_code == 401
    assert "Could not validate credentials" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_token_with_wrong_secret_rejected(client):
    """A JWT signed with a different secret key is rejected with 401."""
    from jose import jwt

    # Sign a token with the WRONG secret
    fake_token = jwt.encode(
        {"sub": "test@example.com", "user_id": 1, "exp": 9999999999},
        "wrong-secret-key",
        algorithm="HS256",
    )

    resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert resp.status_code == 401


# ===================== RATE LIMITING =====================


@pytest.mark.asyncio
async def test_rate_limit_lockout(client):
    """When rate limiter says locked out, login returns 429."""
    await client.post(
        "/auth/register",
        data={"username": "locked", "email": "locked@example.com", "password": "SecurePass1!"},
    )

    with patch("routers.auth.check_login_allowed", new_callable=AsyncMock, return_value=(False, 300)):
        resp = await client.post(
            "/auth/login",
            data={"username": "locked@example.com", "password": "SecurePass1!"},
        )
        assert resp.status_code == 429
        assert "Too many login attempts" in resp.json()["detail"]


# ===================== FORGOT PASSWORD =====================


@pytest.mark.asyncio
async def test_forgot_password_known_email(client):
    """POST /auth/forgot-password with known email returns success (mocked email)."""
    await client.post(
        "/auth/register",
        data={"username": "forgot", "email": "forgot@example.com", "password": "SecurePass1!"},
    )

    with (
        patch("routers.auth.store_password_reset_token", new_callable=AsyncMock),
        patch("app.services.email_service.EmailService.send_password_reset_email", new_callable=AsyncMock, return_value=True),
    ):
        resp = await client.post(
            "/auth/forgot-password",
            json={"email": "forgot@example.com"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True


@pytest.mark.asyncio
async def test_forgot_password_unknown_email(client):
    """POST /auth/forgot-password with unknown email still returns success (anti-enumeration)."""
    resp = await client.post(
        "/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


# ===================== CHANGE PASSWORD =====================


@pytest.mark.asyncio
async def test_change_password_success(client, test_user):
    """Change password with correct old password succeeds."""
    _, _, headers = test_user
    resp = await client.post(
        "/auth/change-password",
        json={
            "old_password": "TestPass123!",
            "new_password": "BrandNewPass1!",
            "confirm_password": "BrandNewPass1!",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Verify new password works for login
    login_resp = await client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "BrandNewPass1!"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_old(client, test_user):
    """Change password with incorrect old password returns 400."""
    _, _, headers = test_user
    resp = await client.post(
        "/auth/change-password",
        json={
            "old_password": "WrongOldPass!",
            "new_password": "NewPass123!",
            "confirm_password": "NewPass123!",
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "incorrect" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_change_password_mismatch(client, test_user):
    """New password and confirm password don't match returns 400."""
    _, _, headers = test_user
    resp = await client.post(
        "/auth/change-password",
        json={
            "old_password": "TestPass123!",
            "new_password": "NewPass123!",
            "confirm_password": "DifferentPass!",
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "do not match" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_change_password_same_as_old(client, test_user):
    """New password same as old password returns 400."""
    _, _, headers = test_user
    resp = await client.post(
        "/auth/change-password",
        json={
            "old_password": "TestPass123!",
            "new_password": "TestPass123!",
            "confirm_password": "TestPass123!",
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "different" in resp.json()["detail"].lower()
