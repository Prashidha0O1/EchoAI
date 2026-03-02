"""Transcript service for real-time conversation management"""
import logging
import json
from typing import List, Dict, Optional
from datetime import datetime, timezone
import redis

logger = logging.getLogger(__name__)


class TranscriptService:
    """Service for managing real-time transcripts with Redis caching"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        """
        Initialize transcript service with Redis connection.
        
        Args:
            redis_url: Redis connection URL
        """
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info("Redis connection established for TranscriptService")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    def _get_transcript_key(self, interview_id: int) -> str:
        """Get Redis key for interview transcript"""
        return f"interview:{interview_id}:transcript"
    
    def _get_context_key(self, interview_id: int) -> str:
        """Get Redis key for interview context (CV + JD)"""
        return f"interview:{interview_id}:context"
    
    async def add_message(
        self,
        interview_id: int,
        sender: str,
        content: str,
        timestamp: Optional[str] = None
    ) -> bool:
        """
        Add a message to the real-time transcript buffer.
        
        Args:
            interview_id: Interview session ID
            sender: 'user' or 'ai'
            content: Message text content
            timestamp: ISO format timestamp (auto-generated if None)
            
        Returns:
            Success status
        """
        if not self.redis_client:
            logger.warning("Redis not available, skipping transcript caching")
            return False
        
        try:
            if timestamp is None:
                timestamp = datetime.now(timezone.utc).isoformat()
            
            message = {
                "sender": sender,
                "content": content,
                "timestamp": timestamp
            }
            
            key = self._get_transcript_key(interview_id)
            self.redis_client.rpush(key, json.dumps(message))
            
            # Set expiration to 24 hours
            self.redis_client.expire(key, 86400)
            
            logger.info(f"Added message to transcript: interview={interview_id}, sender={sender}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding message to transcript: {e}")
            return False
    
    async def get_transcript(self, interview_id: int) -> List[Dict[str, str]]:
        """
        Retrieve the full transcript for an interview.
        
        Args:
            interview_id: Interview session ID
            
        Returns:
            List of message dictionaries
        """
        if not self.redis_client:
            return []
        
        try:
            key = self._get_transcript_key(interview_id)
            messages = self.redis_client.lrange(key, 0, -1)
            
            return [json.loads(msg) for msg in messages]
            
        except Exception as e:
            logger.error(f"Error retrieving transcript: {e}")
            return []
    
    async def clear_transcript(self, interview_id: int) -> bool:
        """
        Clear the transcript buffer for an interview.
        
        Args:
            interview_id: Interview session ID
            
        Returns:
            Success status
        """
        if not self.redis_client:
            return False
        
        try:
            key = self._get_transcript_key(interview_id)
            self.redis_client.delete(key)
            logger.info(f"Cleared transcript for interview {interview_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing transcript: {e}")
            return False
    
    async def cache_interview_context(
        self,
        interview_id: int,
        cv_text: str,
        jd_text: str
    ) -> bool:
        """
        Cache interview context (CV + JD) for quick access during session.
        
        Args:
            interview_id: Interview session ID
            cv_text: Parsed CV text
            jd_text: Job description text
            
        Returns:
            Success status
        """
        if not self.redis_client:
            return False
        
        try:
            context = {
                "cv_text": cv_text,
                "jd_text": jd_text,
                "cached_at": datetime.now(timezone.utc).isoformat()
            }
            
            key = self._get_context_key(interview_id)
            self.redis_client.set(key, json.dumps(context), ex=3600)  # 1 hour expiration
            
            logger.info(f"Cached context for interview {interview_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching interview context: {e}")
            return False
    
    async def get_interview_context(self, interview_id: int) -> Optional[Dict[str, str]]:
        """
        Retrieve cached interview context.
        
        Args:
            interview_id: Interview session ID
            
        Returns:
            Context dictionary or None if not found
        """
        if not self.redis_client:
            return None
        
        try:
            key = self._get_context_key(interview_id)
            context_json = self.redis_client.get(key)
            
            if context_json:
                return json.loads(context_json)
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving interview context: {e}")
            return None
    
    async def get_message_count(self, interview_id: int) -> int:
        """
        Get the number of messages in the transcript.
        
        Args:
            interview_id: Interview session ID
            
        Returns:
            Message count
        """
        if not self.redis_client:
            return 0
        
        try:
            key = self._get_transcript_key(interview_id)
            return self.redis_client.llen(key)
            
        except Exception as e:
            logger.error(f"Error getting message count: {e}")
            return 0
