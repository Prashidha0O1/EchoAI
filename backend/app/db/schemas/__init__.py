"""Pydantic schemas package"""
from app.db.schemas.user import UserBase, UserCreate, UserUpdate, UserOut, UserProfileBase, UserProfileCreate, UserProfileUpdate, UserProfileOut, UserWithProfile
from app.db.schemas.auth import Token, TokenData, LoginRequest, PasswordResetRequest, PasswordResetConfirm
from app.db.schemas.interview import InterviewBase, InterviewCreate, InterviewUpdate, InterviewOut, InterviewList, InterviewType, InterviewStatus
from app.db.schemas.message import MessageBase, MessageCreate, MessageOut, SenderType
from app.db.schemas.feedback import ReportBase, ReportCreate, ReportOut, ReportTagBase, ReportTagCreate, ReportTagOut, TagCategory
from app.db.schemas.common import MessageResponse

__all__ = [
    # User
    "UserBase", "UserCreate", "UserUpdate", "UserOut",
    "UserProfileBase", "UserProfileCreate", "UserProfileUpdate", "UserProfileOut",
    "UserWithProfile",
    # Auth
    "Token", "TokenData", "LoginRequest", "PasswordResetRequest", "PasswordResetConfirm",
    # Interview
    "InterviewBase", "InterviewCreate", "InterviewUpdate", "InterviewOut", "InterviewList",
    "InterviewType", "InterviewStatus",
    # Message
    "MessageBase", "MessageCreate", "MessageOut", "SenderType",
    # Feedback
    "ReportBase", "ReportCreate", "ReportOut",
    "ReportTagBase", "ReportTagCreate", "ReportTagOut", "TagCategory",
    # Common
    "MessageResponse"
]
