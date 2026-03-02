from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    """User authentication table with admin flag"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True, nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    first_name = Column(String(150), nullable=True)
    last_name = Column(String(150), nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    verification_code = Column(String(6), nullable=True)
    verification_code_created_at = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"User(id={self.id}, username={self.username}, email={self.email})"


class UserProfile(Base):
    """User profile with CV file storage"""
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    cv_file_path = Column(String(255), nullable=True)  # Path to uploaded CV file
    cv_parsed_text = Column(Text, nullable=True)  # LLM-extracted content from CV
    profile_picture = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"UserProfile(id={self.id}, user_id={self.user_id})"


class Interview(Base):
    """Interview session with JD and generated questions"""
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    interview_type = Column(String(50), default="mixed")  # technical, behavioral, hr, mixed
    job_description = Column(Text, nullable=True)  # Parsed JD content
    status = Column(String(20), default="pending")  # pending, in_progress, completed
    generated_questions = Column(JSON, nullable=True)  # AI generated questions array
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    full_transcript = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="interviews")
    messages = relationship("Message", back_populates="interview", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="interview", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"Interview(id={self.id}, user_id={self.user_id}, status={self.status})"


class Message(Base):
    """Individual messages in an interview conversation"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(10), nullable=False)  # 'ai' or 'user'
    content = Column(Text, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    audio_url = Column(String(255), nullable=True)  # Optional audio file path
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    interview = relationship("Interview", back_populates="messages")

    def __repr__(self):
        return f"Message(id={self.id}, interview_id={self.interview_id}, sender={self.sender})"


class Report(Base):
    """AI-generated interview feedback report"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    report_name = Column(String(255), nullable=True)
    overall_score = Column(Float, nullable=True)  # 0-100
    performance_metrics = Column(JSON, nullable=True)  # response_time, clarity, relevance scores
    strengths = Column(JSON, nullable=True)  # Array of strengths
    improvements = Column(JSON, nullable=True)  # Array of areas to improve
    summary = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    interview = relationship("Interview", back_populates="report")
    tags = relationship("ReportTag", back_populates="report", cascade="all, delete-orphan")

    def __repr__(self):
        return f"Report(id={self.id}, interview_id={self.interview_id}, score={self.overall_score})"


class ReportTag(Base):
    """Categorized tags for interview reports"""
    __tablename__ = "report_tags"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    tag_name = Column(String(100), nullable=False)  # communication, technical, confidence, etc.
    tag_category = Column(String(50), nullable=False)  # strength, weakness, neutral

    # Relationships
    report = relationship("Report", back_populates="tags")

    def __repr__(self):
        return f"ReportTag(id={self.id}, tag_name={self.tag_name}, category={self.tag_category})"


class Resume(Base):
    """User-built resumes"""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    template = Column(String(50), default="modern")  # modern, classic, minimal, creative
    
    # Personal Info
    full_name = Column(String(200), nullable=True)
    email_contact = Column(String(254), nullable=True)
    phone_contact = Column(String(20), nullable=True)
    location = Column(String(200), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    portfolio_url = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    
    # JSON fields for structured data
    education = Column(JSON, nullable=True)  # [{institution, degree, field, start, end, gpa, achievements}]
    experience = Column(JSON, nullable=True)  # [{company, title, location, start, end, description, achievements}]
    skills = Column(JSON, nullable=True)  # {technical: [], soft: [], languages: [], tools: []}
    projects = Column(JSON, nullable=True)  # [{title, description, technologies, link, start, end}]
    certifications = Column(JSON, nullable=True)  # [{name, issuer, date, credential_id, url}]
    achievements = Column(JSON, nullable=True)  # [{title, description, date}]
    
    is_primary = Column(Boolean, default=False)
    pdf_url = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="resumes")

    def __repr__(self):
        return f"Resume(id={self.id}, user_id={self.user_id}, title={self.title})"
