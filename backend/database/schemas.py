"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============= User Schemas =============

class UserBase(BaseModel):
    """Base user schema"""
    username: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8)


class UserOut(UserBase):
    """Schema for user output (without password)"""
    id: int
    is_admin: bool
    is_active: bool
    email_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserWithProfile(UserOut):
    """User with profile data"""
    profile: Optional['UserProfileOut'] = None

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Schema for updating user info"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


# ============= User Profile Schemas =============

class UserProfileOut(BaseModel):
    """Schema for user profile output"""
    id: int
    user_id: int
    phone: Optional[str] = None
    cv_file_path: Optional[str] = None
    cv_parsed_text: Optional[str] = None
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile"""
    phone: Optional[str] = None
    bio: Optional[str] = None


# ============= Email Verification Schemas =============

class EmailVerificationRequest(BaseModel):
    """Request to send verification code"""
    pass  # Uses authenticated user's email


class EmailVerificationCodeSubmit(BaseModel):
    """Submit verification code for validation"""
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')


# ============= Authentication Schemas =============

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data encoded in JWT token"""
    email: str
    user_id: int


class PasswordResetRequest(BaseModel):
    """Request password reset"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token"""
    token: str
    new_password: str = Field(..., min_length=8)


# ============= Interview Schemas =============

class InterviewCreate(BaseModel):
    """Schema for creating an interview"""
    interview_type: str = Field(..., pattern=r'^(technical|behavioral|hr|mixed)$')
    job_description: Optional[str] = None
    role: Optional[str] = None
    experience_level: Optional[str] = None


class InterviewUpdate(BaseModel):
    """Schema for updating interview"""
    status: Optional[str] = Field(None, pattern=r'^(pending|in_progress|completed|cancelled)$')
    scheduled_at: Optional[datetime] = None


class InterviewOut(BaseModel):
    """Schema for interview output"""
    id: int
    user_id: int
    interview_type: str
    job_description: Optional[str] = None
    role: Optional[str] = None
    experience_level: Optional[str] = None
    status: str
    generated_questions: Optional[Any] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


InterviewList = InterviewOut


class InterviewWithMessages(InterviewOut):
    """Interview with associated messages"""
    messages: List['MessageOut'] = []

    model_config = ConfigDict(from_attributes=True)


# ============= Message Schemas =============

class MessageBase(BaseModel):
    """Base message schema"""
    sender: str = Field(..., pattern=r'^(ai|user)$')
    content: str
    audio_url: Optional[str] = None


class MessageCreate(MessageBase):
    """Schema for creating a message"""
    interview_id: int
    sequence_number: int


class MessageOut(MessageBase):
    """Schema for message output"""
    id: int
    interview_id: int
    sequence_number: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= Report Schemas =============

class ReportTagOut(BaseModel):
    """Schema for a single report tag"""
    id: int
    report_id: int
    tag_name: str
    tag_category: str

    model_config = ConfigDict(from_attributes=True)


class ReportOut(BaseModel):
    """Schema for report output"""
    id: int
    interview_id: int
    report_name: Optional[str] = None
    overall_score: Optional[float] = None
    performance_metrics: Optional[Dict[str, Any]] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    summary: Optional[str] = None
    generated_at: datetime
    tags: List[ReportTagOut] = []

    model_config = ConfigDict(from_attributes=True)


# ============= Resume Schemas =============

class ResumeEducation(BaseModel):
    """Education entry"""
    institution: str
    degree: str
    field: str
    start_date: str
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    achievements: Optional[List[str]] = None


class ResumeExperience(BaseModel):
    """Work experience entry"""
    company: str
    title: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None
    achievements: Optional[List[str]] = None


class ResumeSkills(BaseModel):
    """Skills categorization"""
    technical: Optional[List[str]] = None
    soft: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    tools: Optional[List[str]] = None


class ResumeProject(BaseModel):
    """Project entry"""
    title: str
    description: str
    technologies: Optional[List[str]] = None
    link: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ResumeCertification(BaseModel):
    """Certification entry"""
    name: str
    issuer: str
    date: str
    credential_id: Optional[str] = None
    url: Optional[str] = None


class ResumeAchievement(BaseModel):
    """Achievement entry"""
    title: str
    description: str
    date: Optional[str] = None


class ResumeCreate(BaseModel):
    """Schema for creating a resume"""
    title: str = Field(..., min_length=1, max_length=200)
    template: str = Field(default="modern", pattern=r'^(modern|classic|minimal|creative)$')
    
    # Personal Info
    full_name: Optional[str] = None
    email_contact: Optional[EmailStr] = None
    phone_contact: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    
    # Structured data
    education: Optional[List[ResumeEducation]] = None
    experience: Optional[List[ResumeExperience]] = None
    skills: Optional[ResumeSkills] = None
    projects: Optional[List[ResumeProject]] = None
    certifications: Optional[List[ResumeCertification]] = None
    achievements: Optional[List[ResumeAchievement]] = None
    
    is_primary: bool = False


class ResumeUpdate(BaseModel):
    """Schema for updating a resume"""
    title: Optional[str] = None
    template: Optional[str] = Field(None, pattern=r'^(modern|classic|minimal|creative)$')
    
    # Personal Info
    full_name: Optional[str] = None
    email_contact: Optional[EmailStr] = None
    phone_contact: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    
    # Structured data
    education: Optional[List[ResumeEducation]] = None
    experience: Optional[List[ResumeExperience]] = None
    skills: Optional[ResumeSkills] = None
    projects: Optional[List[ResumeProject]] = None
    certifications: Optional[List[ResumeCertification]] = None
    achievements: Optional[List[ResumeAchievement]] = None
    
    is_primary: Optional[bool] = None


class ResumeOut(BaseModel):
    """Schema for resume output"""
    id: int
    user_id: int
    title: str
    template: str
    
    # Personal Info
    full_name: Optional[str] = None
    email_contact: Optional[str] = None
    phone_contact: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    
    # Structured data
    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    skills: Optional[Dict[str, Any]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    achievements: Optional[List[Dict[str, Any]]] = None
    
    is_primary: bool
    pdf_url: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= Generic Response Schemas =============

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
