from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# ============= Enums =============

class InterviewType(str, Enum):
    technical = "technical"
    behavioral = "behavioral"
    hr = "hr"
    mixed = "mixed"


class InterviewStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class SenderType(str, Enum):
    ai = "ai"
    user = "user"


class TagCategory(str, Enum):
    strength = "strength"
    weakness = "weakness"
    neutral = "neutral"


# ============= User Schemas =============

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    password: Optional[str] = Field(None, min_length=8)


class UserOut(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============= UserProfile Schemas =============

class UserProfileBase(BaseModel):
    phone: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = None


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileOut(UserProfileBase):
    id: int
    user_id: int
    cv_file_path: Optional[str] = None
    cv_parsed_text: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Interview Schemas =============

class InterviewBase(BaseModel):
    interview_type: InterviewType = InterviewType.mixed
    job_description: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    interview_type: Optional[InterviewType] = None
    job_description: Optional[str] = None
    status: Optional[InterviewStatus] = None
    scheduled_at: Optional[datetime] = None


class InterviewOut(InterviewBase):
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
    id: int
    interview_type: InterviewType
    status: InterviewStatus
    scheduled_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============= Message Schemas =============

class MessageBase(BaseModel):
    sender: SenderType
    content: str
    sequence_number: int
    audio_url: Optional[str] = None


class MessageCreate(MessageBase):
    interview_id: int


class MessageOut(MessageBase):
    id: int
    interview_id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# ============= Report Schemas =============

class ReportTagBase(BaseModel):
    tag_name: str = Field(..., max_length=100)
    tag_category: TagCategory


class ReportTagCreate(ReportTagBase):
    pass


class ReportTagOut(ReportTagBase):
    id: int
    report_id: int

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    report_name: Optional[str] = Field(None, max_length=255)
    overall_score: Optional[float] = Field(None, ge=0, le=100)
    performance_metrics: Optional[dict] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    summary: Optional[str] = None


class ReportCreate(ReportBase):
    interview_id: int


class ReportOut(ReportBase):
    id: int
    interview_id: int
    generated_at: datetime
    tags: List[ReportTagOut] = []

    class Config:
        from_attributes = True


# ============= Auth Schemas =============

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


# ============= Response Schemas =============

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class UserWithProfile(UserOut):
    profile: Optional[UserProfileOut] = None

    class Config:
        from_attributes = True
