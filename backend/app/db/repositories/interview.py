"""Interview repository"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.db.models.interview import Interview
from app.db.schemas import InterviewCreate, InterviewUpdate


class InterviewRepository:
    """Repository for Interview operations"""
    
    @staticmethod
    def create(db: Session, user_id: int, interview: InterviewCreate) -> Interview:
        """Create a new interview"""
        db_interview = Interview(
            user_id=user_id,
            interview_type=interview.interview_type,
            job_description=interview.job_description,
            scheduled_at=interview.scheduled_at
        )
        db.add(db_interview)
        db.commit()
        db.refresh(db_interview)
        return db_interview
    
    @staticmethod
    def get(db: Session, interview_id: int) -> Optional[Interview]:
        """Get interview by ID"""
        return db.query(Interview).filter(Interview.id == interview_id).first()
    
    @staticmethod
    def get_user_interviews(db: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[Interview]:
        """Get all interviews for a user"""
        return db.query(Interview)\
            .filter(Interview.user_id == user_id)\
            .order_by(desc(Interview.created_at))\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    @staticmethod
    def update(db: Session, interview_id: int, interview_update: InterviewUpdate) -> Optional[Interview]:
        """Update an interview"""
        db_interview = InterviewRepository.get(db, interview_id)
        if not db_interview:
            return None
        
        update_data = interview_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_interview, key, value)
        
        db.commit()
        db.refresh(db_interview)
        return db_interview
    
    @staticmethod
    def update_status(db: Session, interview_id: int, status: str, **kwargs) -> Optional[Interview]:
        """Update interview status and additional fields"""
        db_interview = InterviewRepository.get(db, interview_id)
        if not db_interview:
            return None
        
        db_interview.status = status
        for key, value in kwargs.items():
            if hasattr(db_interview, key):
                setattr(db_interview, key, value)
        
        db.commit()
        db.refresh(db_interview)
        return db_interview
    
    @staticmethod
    def delete(db: Session, interview_id: int) -> bool:
        """Delete an interview"""
        db_interview = InterviewRepository.get(db, interview_id)
        if not db_interview:
            return False
        
        db.delete(db_interview)
        db.commit()
        return True
