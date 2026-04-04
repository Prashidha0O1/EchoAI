"""Redis client for rate limiting and caching — async (redis.asyncio)

Gracefully degrades when Redis is unavailable so that core auth
flows (login, register, password reset) keep working without it.
"""
import json
import logging
from typing import Optional

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Async Redis client singleton with connection timeouts."""

    _instance: Optional[Redis] = None

    @classmethod
    def get_client(cls) -> Redis:
        """Return the shared async Redis instance, creating it on first call."""
        if cls._instance is None:
            cls._instance = Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_timeout=3,
                socket_connect_timeout=3,
                retry_on_timeout=False,
            )
        return cls._instance

    @classmethod
    async def close(cls) -> None:
        """Close the Redis connection."""
        if cls._instance:
            await cls._instance.aclose()
            cls._instance = None


def get_redis() -> Redis:
    """FastAPI dependency — returns the async Redis client."""
    return RedisClient.get_client()


# ============= Rate Limiting Functions =============

def get_login_attempts_key(email: str) -> str:
    return f"login_attempts:{email}"


def get_login_lockout_key(email: str) -> str:
    return f"login_lockout:{email}"


async def check_login_allowed(email: str) -> tuple[bool, int]:
    """
    Check if login is allowed for the given email.
    Returns (is_allowed, remaining_attempts_or_lockout_seconds).
    If Redis is unreachable, allows login (graceful degradation).
    """
    try:
        client = get_redis()
        lockout_key = get_login_lockout_key(email)

        lockout_ttl = await client.ttl(lockout_key)
        if lockout_ttl > 0:
            return False, lockout_ttl

        attempts_key = get_login_attempts_key(email)
        attempts = await client.get(attempts_key)
        current_attempts = int(attempts) if attempts else 0
        remaining = settings.MAX_LOGIN_ATTEMPTS - current_attempts

        return True, remaining
    except Exception as exc:
        logger.warning("Redis unavailable for rate-limit check — skipping: %s", exc)
        return True, settings.MAX_LOGIN_ATTEMPTS


async def increment_login_attempts(email: str) -> tuple[bool, int]:
    """
    Increment login attempts after failed login.
    Returns (is_locked_out, remaining_attempts_or_lockout_seconds).
    """
    try:
        client = get_redis()
        attempts_key = get_login_attempts_key(email)
        lockout_key = get_login_lockout_key(email)

        current_attempts = await client.incr(attempts_key)
        await client.expire(attempts_key, 900)

        if current_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            await client.setex(lockout_key, settings.LOGIN_LOCKOUT_SECONDS, "locked")
            await client.delete(attempts_key)
            return True, settings.LOGIN_LOCKOUT_SECONDS

        remaining = settings.MAX_LOGIN_ATTEMPTS - current_attempts
        return False, remaining
    except Exception as exc:
        logger.warning("Redis unavailable for login-attempt tracking — skipping: %s", exc)
        return False, settings.MAX_LOGIN_ATTEMPTS


async def reset_login_attempts(email: str) -> None:
    """Reset login attempts after successful login."""
    try:
        client = get_redis()
        attempts_key = get_login_attempts_key(email)
        lockout_key = get_login_lockout_key(email)
        await client.delete(attempts_key, lockout_key)
    except Exception as exc:
        logger.warning("Redis unavailable for login-attempt reset — skipping: %s", exc)


# ============= Password Reset Token Functions =============

def get_password_reset_key(token: str) -> str:
    return f"password_reset:{token}"


async def store_password_reset_token(email: str, token: str) -> None:
    """Store password reset token with expiry."""
    try:
        client = get_redis()
        key = get_password_reset_key(token)
        await client.setex(key, settings.PASSWORD_RESET_TOKEN_EXPIRE, email)
    except Exception as exc:
        logger.error("Redis unavailable — cannot store password-reset token: %s", exc)
        raise


async def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify password reset token. Returns email if valid, None otherwise."""
    try:
        client = get_redis()
        key = get_password_reset_key(token)
        email = await client.get(key)
        return email
    except Exception as exc:
        logger.error("Redis unavailable — cannot verify password-reset token: %s", exc)
        return None


async def delete_password_reset_token(token: str) -> None:
    """Delete password reset token after use."""
    try:
        client = get_redis()
        key = get_password_reset_key(token)
        await client.delete(key)
    except Exception as exc:
        logger.warning("Redis unavailable — cannot delete password-reset token: %s", exc)


# ============= Session/Cache Functions =============

async def cache_interview_questions(
    interview_id: int, questions: list, expire: int = 3600
) -> None:
    """Cache generated interview questions."""
    try:
        client = get_redis()
        key = f"interview_questions:{interview_id}"
        await client.setex(key, expire, json.dumps(questions))
    except Exception as exc:
        logger.warning("Redis unavailable — cannot cache questions: %s", exc)


async def get_cached_interview_questions(interview_id: int) -> Optional[list]:
    """Get cached interview questions."""
    try:
        client = get_redis()
        key = f"interview_questions:{interview_id}"
        data = await client.get(key)
        return json.loads(data) if data else None
    except Exception as exc:
        logger.warning("Redis unavailable — cache miss for questions: %s", exc)
        return None
