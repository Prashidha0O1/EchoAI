"""Report and ReportTag database models"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


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
