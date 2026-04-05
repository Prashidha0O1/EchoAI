"""
Shared test fixtures for EchoAI backend integration tests.

Must set environment variables BEFORE importing any application modules,
because database/database.py reads DATABASE_URL at import time.
"""
import os
import sys

# ---------- 1. Environment overrides (BEFORE any app imports) ----------

os.environ["DATABASE_URL"] = "sqlite:///./test_echoai.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"

# Ensure the backend directory is on sys.path so `import main` works
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ---------- 2. Monkey-patch the database engine ----------

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

TEST_DB_PATH = os.path.join(BACKEND_DIR, "test_echoai.db")
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)


# Enable WAL mode and foreign keys for SQLite
@event.listens_for(test_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch database module BEFORE importing app
import database.database as db_module

db_module.engine = test_engine
db_module.SessionLocal = TestSessionLocal

# ---------- 3. Now safe to import application modules ----------

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from main import app
from database.database import get_db, Base
from database import auth as db_auth


# ---------- 4. Override the get_db dependency ----------

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ---------- 5. Redis mock (autouse) ----------
# Redis functions are imported BY NAME into routers.auth,
# so we must patch at the call site, not at the source module.

@pytest.fixture(autouse=True)
def mock_redis():
    """Mock all Redis calls so tests don't need a running Redis server."""
    with (
        patch("routers.auth.check_login_allowed", new_callable=AsyncMock, return_value=(True, 5)),
        patch("routers.auth.increment_login_attempts", new_callable=AsyncMock, return_value=(False, 4)),
        patch("routers.auth.reset_login_attempts", new_callable=AsyncMock),
        patch("routers.auth.store_password_reset_token", new_callable=AsyncMock),
        patch("routers.auth.verify_password_reset_token", new_callable=AsyncMock, return_value=None),
        patch("routers.auth.delete_password_reset_token", new_callable=AsyncMock),
    ):
        yield


# ---------- 6. Database lifecycle ----------

@pytest.fixture(autouse=True, scope="function")
def setup_database():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    # Clean all data between tests
    db = TestSessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    finally:
        db.close()


# ---------- 7. HTTP client fixture ----------

@pytest.fixture
async def client():
    """Async HTTP client hitting the FastAPI app via ASGI transport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------- 8. Helper: register + login a user ----------

async def _register_and_login(client: AsyncClient, username: str, email: str, password: str = "TestPass123!"):
    """Register a user and return (user_data, token, auth_headers)."""
    reg_resp = await client.post(
        "/auth/register",
        data={"username": username, "email": email, "password": password},
    )
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    user_data = reg_resp.json()

    login_resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return user_data, token, headers


# ---------- 9. Test user fixtures ----------

@pytest.fixture
async def test_user(client):
    """Register and log in a regular test user. Returns (user_data, token, headers)."""
    return await _register_and_login(client, "testuser", "test@example.com")


@pytest.fixture
async def auth_headers(test_user):
    """Convenience fixture — just the Authorization headers."""
    return test_user[2]


@pytest.fixture
async def admin_user(client):
    """Create an admin user in the DB and log in to get a token.

    Each test starts with clean tables, so we always create fresh.
    """
    from database import models
    from database.auth import get_password_hash

    admin_email = "testadmin@echo.ai"
    admin_password = "AdminPass123!"

    db = TestSessionLocal()
    try:
        admin = models.User(
            username="testadmin",
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            is_admin=True,
            is_active=True,
            email_verified=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        admin_id = admin.id  # capture before session closes

        profile = models.UserProfile(user_id=admin_id)
        db.add(profile)
        db.commit()
    finally:
        db.close()

    login_resp = await client.post(
        "/auth/login",
        data={"username": admin_email, "password": admin_password},
    )
    assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return {"id": admin_id, "email": admin_email}, token, headers


@pytest.fixture
async def admin_headers(admin_user):
    """Convenience fixture — just the admin Authorization headers."""
    return admin_user[2]
