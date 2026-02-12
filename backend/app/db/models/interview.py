"""Interview database model"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


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
