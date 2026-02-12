"""Interview-related Pydantic schemas"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class InterviewType(str, Enum):
    """Interview type enumeration"""
    technical = "technical"
    behavioral = "behavioral"
    hr = "hr"
    mixed = "mixed"


class InterviewStatus(str, Enum):
    """Interview status enumeration"""
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class InterviewBase(BaseModel):
    """Base interview schema"""
    interview_type: InterviewType = InterviewType.mixed
    job_description: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class InterviewCreate(InterviewBase):
    """Schema for creating an interview"""
    pass


class InterviewUpdate(BaseModel):
    """Schema for updating an interview"""
    interview_type: Optional[InterviewType] = None
    job_description: Optional[str] = None
    status: Optional[InterviewStatus] = None
    scheduled_at: Optional[datetime] = None


class InterviewOut(InterviewBase):
    """Schema for interview output"""
    id: int
    user_id: int
    status: InterviewStatus
    generated_questions: Optional[List[Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    full_transcript: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewList(BaseModel):
    """Schema for interview list items"""
    id: int
    interview_type: InterviewType
    status: InterviewStatus
    scheduled_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
