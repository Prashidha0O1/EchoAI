"""Report and ReportTag repositories"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.models.feedback import Report, ReportTag
from app.db.schemas import ReportCreate, ReportBase, ReportTagCreate


class ReportRepository:
    """Repository for Report operations"""
    
    @staticmethod
    def create(db: Session, report: ReportCreate) -> Report:
        """Create a new report"""
        db_report = Report(**report.model_dump())
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report
    
    @staticmethod
    def get_by_interview(db: Session, interview_id: int) -> Optional[Report]:
        """Get report by interview ID"""
        return db.query(Report).filter(Report.interview_id == interview_id).first()
    
    @staticmethod
    def update(db: Session, report_id: int, report_update: ReportBase) -> Optional[Report]:
        """Update a report"""
        db_report = db.query(Report).filter(Report.id == report_id).first()
        if not db_report:
            return None
        
        update_data = report_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_report, key, value)
        
        db.commit()
        db.refresh(db_report)
        return db_report


class ReportTagRepository:
    """Repository for ReportTag operations"""
    
    @staticmethod
    def create(db: Session, report_id: int, tag: ReportTagCreate) -> ReportTag:
        """Create a new report tag"""
        db_tag = ReportTag(report_id=report_id, **tag.model_dump())
        db.add(db_tag)
        db.commit()
        db.refresh(db_tag)
        return db_tag
    
    @staticmethod
    def get_report_tags(db: Session, report_id: int) -> List[ReportTag]:
        """Get all tags for a report"""
        return db.query(ReportTag).filter(ReportTag.report_id == report_id).all()
    
    @staticmethod
    def delete(db: Session, tag_id: int) -> bool:
        """Delete a report tag"""
        db_tag = db.query(ReportTag).filter(ReportTag.id == tag_id).first()
        if not db_tag:
            return False
        
        db.delete(db_tag)
        db.commit()
        return True
