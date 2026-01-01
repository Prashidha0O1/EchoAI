from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from . import models, schemas, auth


# ============= User CRUD =============

def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create empty profile for the user
    db_profile = models.UserProfile(user_id=db_user.id)
    db.add(db_profile)
    db.commit()
    
    return db_user


def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate) -> Optional[models.User]:
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = auth.get_password_hash(update_data.pop("password"))
    
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


# ============= UserProfile CRUD =============

def get_user_profile(db: Session, user_id: int) -> Optional[models.UserProfile]:
    return db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()


def update_user_profile(
    db: Session, 
    user_id: int, 
    profile_update: schemas.UserProfileUpdate,
    cv_file_path: Optional[str] = None,
    cv_parsed_text: Optional[str] = None,
    profile_picture: Optional[str] = None
) -> Optional[models.UserProfile]:
    db_profile = get_user_profile(db, user_id)
    if not db_profile:
        return None
    
    update_data = profile_update.model_dump(exclude_unset=True)
    
    if cv_file_path is not None:
        update_data["cv_file_path"] = cv_file_path
    if cv_parsed_text is not None:
        update_data["cv_parsed_text"] = cv_parsed_text
    if profile_picture is not None:
        update_data["profile_picture"] = profile_picture
    
    for key, value in update_data.items():
        setattr(db_profile, key, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile


# ============= Interview CRUD =============

def create_interview(db: Session, user_id: int, interview: schemas.InterviewCreate) -> models.Interview:
    db_interview = models.Interview(
        user_id=user_id,
        interview_type=interview.interview_type,
        job_description=interview.job_description,
        scheduled_at=interview.scheduled_at
    )
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    return db_interview


def get_interview(db: Session, interview_id: int) -> Optional[models.Interview]:
    return db.query(models.Interview).filter(models.Interview.id == interview_id).first()


def get_user_interviews(db: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[models.Interview]:
    return db.query(models.Interview)\
        .filter(models.Interview.user_id == user_id)\
        .order_by(desc(models.Interview.created_at))\
        .offset(skip)\
        .limit(limit)\
        .all()


def update_interview(db: Session, interview_id: int, interview_update: schemas.InterviewUpdate) -> Optional[models.Interview]:
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return None
    
    update_data = interview_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_interview, key, value)
    
    db.commit()
    db.refresh(db_interview)
    return db_interview


def update_interview_status(db: Session, interview_id: int, status: str, **kwargs) -> Optional[models.Interview]:
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return None
    
    db_interview.status = status
    for key, value in kwargs.items():
        if hasattr(db_interview, key):
            setattr(db_interview, key, value)
    
    db.commit()
    db.refresh(db_interview)
    return db_interview


def delete_interview(db: Session, interview_id: int) -> bool:
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return False
    
    db.delete(db_interview)
    db.commit()
    return True


# ============= Message CRUD =============

def create_message(db: Session, message: schemas.MessageCreate) -> models.Message:
    db_message = models.Message(**message.model_dump())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_interview_messages(db: Session, interview_id: int) -> List[models.Message]:
    return db.query(models.Message)\
        .filter(models.Message.interview_id == interview_id)\
        .order_by(models.Message.sequence_number)\
        .all()


def get_next_sequence_number(db: Session, interview_id: int) -> int:
    last_message = db.query(models.Message)\
        .filter(models.Message.interview_id == interview_id)\
        .order_by(desc(models.Message.sequence_number))\
        .first()
    return (last_message.sequence_number + 1) if last_message else 1


# ============= Report CRUD =============

def create_report(db: Session, report: schemas.ReportCreate) -> models.Report:
    db_report = models.Report(**report.model_dump())
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


def get_interview_report(db: Session, interview_id: int) -> Optional[models.Report]:
    return db.query(models.Report).filter(models.Report.interview_id == interview_id).first()


def update_report(db: Session, report_id: int, report_update: schemas.ReportBase) -> Optional[models.Report]:
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not db_report:
        return None
    
    update_data = report_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_report, key, value)
    
    db.commit()
    db.refresh(db_report)
    return db_report


# ============= ReportTag CRUD =============

def create_report_tag(db: Session, report_id: int, tag: schemas.ReportTagCreate) -> models.ReportTag:
    db_tag = models.ReportTag(report_id=report_id, **tag.model_dump())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


def get_report_tags(db: Session, report_id: int) -> List[models.ReportTag]:
    return db.query(models.ReportTag).filter(models.ReportTag.report_id == report_id).all()


def delete_report_tag(db: Session, tag_id: int) -> bool:
    db_tag = db.query(models.ReportTag).filter(models.ReportTag.id == tag_id).first()
    if not db_tag:
        return False
    
    db.delete(db_tag)
    db.commit()
    return True
