import redis
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Rate limiting settings
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 300  # 5 minutes
PASSWORD_RESET_TOKEN_EXPIRE = 3600  # 1 hour


class RedisClient:
    """Redis client for rate limiting and token storage"""
    
    _instance: Optional[redis.Redis] = None
    
    @classmethod
    def get_client(cls) -> redis.Redis:
        if cls._instance is None:
            cls._instance = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                decode_responses=True
            )
        return cls._instance
    
    @classmethod
    def close(cls):
        if cls._instance:
            cls._instance.close()
            cls._instance = None


def get_redis() -> redis.Redis:
    """Dependency for getting Redis client"""
    return RedisClient.get_client()


# ============= Rate Limiting Functions =============

def get_login_attempts_key(email: str) -> str:
    """Generate Redis key for login attempts"""
    return f"login_attempts:{email}"


def get_login_lockout_key(email: str) -> str:
    """Generate Redis key for login lockout"""
    return f"login_lockout:{email}"


def check_login_allowed(email: str) -> tuple[bool, int]:
    """
    Check if login is allowed for the given email.
    Returns: (is_allowed, remaining_attempts or lockout_seconds)
    """
    client = get_redis()
    lockout_key = get_login_lockout_key(email)
    
    # Check if user is locked out
    lockout_ttl = client.ttl(lockout_key)
    if lockout_ttl > 0:
        return False, lockout_ttl
    
    # Get current attempts
    attempts_key = get_login_attempts_key(email)
    attempts = client.get(attempts_key)
    current_attempts = int(attempts) if attempts else 0
    remaining = MAX_LOGIN_ATTEMPTS - current_attempts
    
    return True, remaining


def increment_login_attempts(email: str) -> tuple[bool, int]:
    """
    Increment login attempts after failed login.
    Returns: (is_locked_out, remaining_attempts or lockout_seconds)
    """
    client = get_redis()
    attempts_key = get_login_attempts_key(email)
    lockout_key = get_login_lockout_key(email)
    
    # Increment attempts
    current_attempts = client.incr(attempts_key)
    
    # Set expiry for attempts key (reset after 15 minutes of no attempts)
    client.expire(attempts_key, 900)
    
    # Check if should lock out
    if current_attempts >= MAX_LOGIN_ATTEMPTS:
        # Set lockout
        client.setex(lockout_key, LOGIN_LOCKOUT_SECONDS, "locked")
        # Clear attempts counter
        client.delete(attempts_key)
        return True, LOGIN_LOCKOUT_SECONDS
    
    remaining = MAX_LOGIN_ATTEMPTS - current_attempts
    return False, remaining


def reset_login_attempts(email: str) -> None:
    """Reset login attempts after successful login"""
    client = get_redis()
    attempts_key = get_login_attempts_key(email)
    lockout_key = get_login_lockout_key(email)
    client.delete(attempts_key, lockout_key)


# ============= Password Reset Token Functions =============

def get_password_reset_key(token: str) -> str:
    """Generate Redis key for password reset token"""
    return f"password_reset:{token}"


def store_password_reset_token(email: str, token: str) -> None:
    """Store password reset token with expiry"""
    client = get_redis()
    key = get_password_reset_key(token)
    client.setex(key, PASSWORD_RESET_TOKEN_EXPIRE, email)


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify password reset token.
    Returns email if valid, None otherwise.
    """
    client = get_redis()
    key = get_password_reset_key(token)
    email = client.get(key)
    return email


def delete_password_reset_token(token: str) -> None:
    """Delete password reset token after use"""
    client = get_redis()
    key = get_password_reset_key(token)
    client.delete(key)


# ============= Session/Cache Functions (for future use) =============

def cache_interview_questions(interview_id: int, questions: list, expire: int = 3600) -> None:
    """Cache generated interview questions"""
    client = get_redis()
    import json
    key = f"interview_questions:{interview_id}"
    client.setex(key, expire, json.dumps(questions))


def get_cached_interview_questions(interview_id: int) -> Optional[list]:
    """Get cached interview questions"""
    client = get_redis()
    import json
    key = f"interview_questions:{interview_id}"
    data = client.get(key)
    return json.loads(data) if data else None
