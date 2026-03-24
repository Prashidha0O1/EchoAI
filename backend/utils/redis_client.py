"""Redis client for rate limiting and token storage — async (redis.asyncio)"""
import json
import os
from typing import Optional

from dotenv import load_dotenv
from redis.asyncio import Redis

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Rate limiting settings
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 300  # 5 minutes
PASSWORD_RESET_TOKEN_EXPIRE = 3600  # 1 hour


class RedisClient:
    """Async Redis client singleton for rate limiting and token storage."""

    _instance: Optional[Redis] = None

    @classmethod
    def get_client(cls) -> Redis:
        if cls._instance is None:
            cls._instance = Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                decode_responses=True,
            )
        return cls._instance

    @classmethod
    async def close(cls) -> None:
        if cls._instance:
            await cls._instance.aclose()
            cls._instance = None


def get_redis() -> Redis:
    """Return the shared async Redis client."""
    return RedisClient.get_client()


# ============= Rate Limiting Functions =============

def get_login_attempts_key(email: str) -> str:
    return f"login_attempts:{email}"


def get_login_lockout_key(email: str) -> str:
    return f"login_lockout:{email}"


async def check_login_allowed(email: str) -> tuple[bool, int]:
    """
    Check if login is allowed for the given email.
    Returns: (is_allowed, remaining_attempts or lockout_seconds)
    """
    client = get_redis()
    lockout_key = get_login_lockout_key(email)

    lockout_ttl = await client.ttl(lockout_key)
    if lockout_ttl > 0:
        return False, lockout_ttl

    attempts_key = get_login_attempts_key(email)
    attempts = await client.get(attempts_key)
    current_attempts = int(attempts) if attempts else 0
    remaining = MAX_LOGIN_ATTEMPTS - current_attempts

    return True, remaining


async def increment_login_attempts(email: str) -> tuple[bool, int]:
    """
    Increment login attempts after failed login.
    Returns: (is_locked_out, remaining_attempts or lockout_seconds)
    """
    client = get_redis()
    attempts_key = get_login_attempts_key(email)
    lockout_key = get_login_lockout_key(email)

    current_attempts = await client.incr(attempts_key)
    await client.expire(attempts_key, 900)

    if current_attempts >= MAX_LOGIN_ATTEMPTS:
        await client.setex(lockout_key, LOGIN_LOCKOUT_SECONDS, "locked")
        await client.delete(attempts_key)
        return True, LOGIN_LOCKOUT_SECONDS

    remaining = MAX_LOGIN_ATTEMPTS - current_attempts
    return False, remaining


async def reset_login_attempts(email: str) -> None:
    """Reset login attempts after successful login."""
    client = get_redis()
    attempts_key = get_login_attempts_key(email)
    lockout_key = get_login_lockout_key(email)
    await client.delete(attempts_key, lockout_key)


# ============= Password Reset Token Functions =============

def get_password_reset_key(token: str) -> str:
    return f"password_reset:{token}"


async def store_password_reset_token(email: str, token: str) -> None:
    """Store password reset token with expiry."""
    client = get_redis()
    key = get_password_reset_key(token)
    await client.setex(key, PASSWORD_RESET_TOKEN_EXPIRE, email)


async def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify password reset token. Returns email if valid, None otherwise."""
    client = get_redis()
    key = get_password_reset_key(token)
    email = await client.get(key)
    return email


async def delete_password_reset_token(token: str) -> None:
    """Delete password reset token after use."""
    client = get_redis()
    key = get_password_reset_key(token)
    await client.delete(key)


# ============= Session/Cache Functions =============

async def cache_interview_questions(
    interview_id: int, questions: list, expire: int = 3600
) -> None:
    """Cache generated interview questions."""
    client = get_redis()
    key = f"interview_questions:{interview_id}"
    await client.setex(key, expire, json.dumps(questions))


async def get_cached_interview_questions(interview_id: int) -> Optional[list]:
    """Get cached interview questions."""
    client = get_redis()
    key = f"interview_questions:{interview_id}"
    data = await client.get(key)
    return json.loads(data) if data else None
