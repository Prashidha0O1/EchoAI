"""Message-related Pydantic schemas"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class SenderType(str, Enum):
    """Message sender type"""
    ai = "ai"
    user = "user"


class MessageBase(BaseModel):
    """Base message schema"""
    sender: SenderType
    content: str
    sequence_number: int
    audio_url: Optional[str] = None


class MessageCreate(MessageBase):
    """Schema for creating a message"""
    interview_id: int


class MessageOut(MessageBase):
    """Schema for message output"""
    id: int
    interview_id: int
    timestamp: datetime

    class Config:
        from_attributes = True
