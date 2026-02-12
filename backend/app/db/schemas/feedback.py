"""Feedback/Report-related Pydantic schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TagCategory(str, Enum):
    """Report tag category"""
    strength = "strength"
    weakness = "weakness"
    neutral = "neutral"


class ReportTagBase(BaseModel):
    """Base report tag schema"""
    tag_name: str = Field(..., max_length=100)
    tag_category: TagCategory


class ReportTagCreate(ReportTagBase):
    """Schema for creating a report tag"""
    pass


class ReportTagOut(ReportTagBase):
    """Schema for report tag output"""
    id: int
    report_id: int

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    """Base report schema"""
    report_name: Optional[str] = Field(None, max_length=255)
    overall_score: Optional[float] = Field(None, ge=0, le=100)
    performance_metrics: Optional[dict] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    summary: Optional[str] = None


class ReportCreate(ReportBase):
    """Schema for creating a report"""
    interview_id: int


class ReportOut(ReportBase):
    """Schema for report output"""
    id: int
    interview_id: int
    generated_at: datetime
    tags: List[ReportTagOut] = []

    class Config:
        from_attributes = True
