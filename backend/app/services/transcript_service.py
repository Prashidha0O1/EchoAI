"""Transcript service for real-time conversation management — async (redis.asyncio)"""
import logging
import json
from typing import List, Dict, Optional
from datetime import datetime, timezone

from redis.asyncio import Redis

logger = logging.getLogger(__name__)


class TranscriptService:
    """Service for managing real-time transcripts with async Redis caching."""

    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        """
        Initialize transcript service with an async Redis client.

        Args:
            redis_url: Redis connection URL
        """
        try:
            self.redis_client: Optional[Redis] = Redis.from_url(
                redis_url, decode_responses=True
            )
            logger.info("Async Redis client created for TranscriptService")
        except Exception as e:
            logger.error(f"Failed to create Redis client: {e}")
            self.redis_client = None

    def _get_transcript_key(self, interview_id: int) -> str:
        return f"interview:{interview_id}:transcript"

    def _get_context_key(self, interview_id: int) -> str:
        return f"interview:{interview_id}:context"

    async def add_message(
        self,
        interview_id: int,
        sender: str,
        content: str,
        timestamp: Optional[str] = None,
    ) -> bool:
        """Add a message to the real-time transcript buffer."""
        if not self.redis_client:
            logger.warning("Redis not available, skipping transcript caching")
            return False

        try:
            if timestamp is None:
                timestamp = datetime.now(timezone.utc).isoformat()

            message = {"sender": sender, "content": content, "timestamp": timestamp}
            key = self._get_transcript_key(interview_id)
            await self.redis_client.rpush(key, json.dumps(message))
            await self.redis_client.expire(key, 86400)  # 24 hours

            logger.info(f"Added message to transcript: interview={interview_id}, sender={sender}")
            return True

        except Exception as e:
            logger.error(f"Error adding message to transcript: {e}")
            return False

    async def get_transcript(self, interview_id: int) -> List[Dict[str, str]]:
        """Retrieve the full transcript for an interview."""
        if not self.redis_client:
            return []

        try:
            key = self._get_transcript_key(interview_id)
            messages = await self.redis_client.lrange(key, 0, -1)
            return [json.loads(msg) for msg in messages]

        except Exception as e:
            logger.error(f"Error retrieving transcript: {e}")
            return []

    async def clear_transcript(self, interview_id: int) -> bool:
        """Clear the transcript buffer for an interview."""
        if not self.redis_client:
            return False

        try:
            key = self._get_transcript_key(interview_id)
            await self.redis_client.delete(key)
            logger.info(f"Cleared transcript for interview {interview_id}")
            return True

        except Exception as e:
            logger.error(f"Error clearing transcript: {e}")
            return False

    async def cache_interview_context(
        self,
        interview_id: int,
        cv_text: str,
        jd_text: str,
    ) -> bool:
        """Cache interview context (CV + JD) for quick access during session."""
        if not self.redis_client:
            return False

        try:
            context = {
                "cv_text": cv_text,
                "jd_text": jd_text,
                "cached_at": datetime.now(timezone.utc).isoformat(),
            }
            key = self._get_context_key(interview_id)
            await self.redis_client.set(key, json.dumps(context), ex=3600)  # 1 hour

            logger.info(f"Cached context for interview {interview_id}")
            return True

        except Exception as e:
            logger.error(f"Error caching interview context: {e}")
            return False

    async def get_interview_context(self, interview_id: int) -> Optional[Dict[str, str]]:
        """Retrieve cached interview context."""
        if not self.redis_client:
            return None

        try:
            key = self._get_context_key(interview_id)
            context_json = await self.redis_client.get(key)
            if context_json:
                return json.loads(context_json)
            return None

        except Exception as e:
            logger.error(f"Error retrieving interview context: {e}")
            return None

    async def get_message_count(self, interview_id: int) -> int:
        """Get the number of messages in the transcript."""
        if not self.redis_client:
            return 0

        try:
            key = self._get_transcript_key(interview_id)
            return await self.redis_client.llen(key)

        except Exception as e:
            logger.error(f"Error getting message count: {e}")
            return 0
