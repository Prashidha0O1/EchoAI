"""User-related Pydantic schemas"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema"""
    username: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    password: Optional[str] = Field(None, min_length=8)


class UserOut(UserBase):
    """Schema for user output"""
    id: int
    is_admin: bool
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileBase(BaseModel):
    """Base user profile schema"""
    phone: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = None


class UserProfileCreate(UserProfileBase):
    """Schema for creating a user profile"""
    pass


class UserProfileUpdate(UserProfileBase):
    """Schema for updating a user profile"""
    pass


class UserProfileOut(UserProfileBase):
    """Schema for user profile output"""
    id: int
    user_id: int
    cv_file_path: Optional[str] = None
    cv_parsed_text: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserWithProfile(UserOut):
    """User schema with profile embedded"""
    profile: Optional[UserProfileOut] = None

    class Config:
        from_attributes = True
