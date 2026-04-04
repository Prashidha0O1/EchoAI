"""CRUD operations for database models"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import Optional, List
from . import models, schemas, auth


# ============= User CRUD =============

def get_user(db: Session, user_id: int) -> Optional[models.User]:
    """Get user by ID"""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Get user by email (case-insensitive)"""
    return db.query(models.User).filter(func.lower(models.User.email) == email.lower().strip()).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    """Get user by username"""
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Create a new user"""
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email.lower().strip(),
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        email_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create empty profile for user
    profile = models.UserProfile(user_id=db_user.id)
    db.add(profile)
    db.commit()
    
    return db_user


def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate) -> Optional[models.User]:
    """Update user information"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def set_email_verified(db: Session, user_id: int, verified: bool = True) -> Optional[models.User]:
    """Mark user email as verified"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    db_user.email_verified = verified
    if verified:
        db_user.verification_code = None
        db_user.verification_code_created_at = None
    
    db.commit()
    db.refresh(db_user)
    return db_user


def set_verification_code(db: Session, user_id: int, code: str) -> Optional[models.User]:
    """Set verification code for user"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    db_user.verification_code = code
    db_user.verification_code_created_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(db_user)
    return db_user


# ============= User Profile CRUD =============

def get_user_profile(db: Session, user_id: int) -> Optional[models.UserProfile]:
    """Get user profile"""
    return db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()


def update_user_profile(
    db: Session,
    user_id: int,
    profile_update: schemas.UserProfileUpdate,
    **extra_fields,
) -> Optional[models.UserProfile]:
    """Update user profile.

    ``extra_fields`` allows callers to set model columns that are not part of
    the Pydantic schema (e.g. cv_file_path, cv_parsed_text, profile_picture).
    """
    db_profile = get_user_profile(db, user_id)
    if not db_profile:
        return None

    update_data = profile_update.model_dump(exclude_unset=True)
    update_data.update(extra_fields)

    for field, value in update_data.items():
        setattr(db_profile, field, value)

    db_profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_profile)
    return db_profile


# ============= Interview CRUD =============

def create_interview(db: Session, user_id: int, interview: schemas.InterviewCreate) -> models.Interview:
    """Create a new interview"""
    db_interview = models.Interview(
        user_id=user_id,
        interview_type=interview.interview_type,
        job_description=interview.job_description,
        status="pending"
    )
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    return db_interview


def get_interview(db: Session, interview_id: int) -> Optional[models.Interview]:
    """Get interview by ID"""
    return db.query(models.Interview).filter(models.Interview.id == interview_id).first()


def get_user_interviews(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Interview]:
    """Get all interviews for a user"""
    return db.query(models.Interview)\
        .filter(models.Interview.user_id == user_id)\
        .order_by(models.Interview.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()


def update_interview(db: Session, interview_id: int, interview_update: schemas.InterviewUpdate) -> Optional[models.Interview]:
    """Update interview"""
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return None
    
    update_data = interview_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_interview, field, value)
    
    db.commit()
    db.refresh(db_interview)
    return db_interview


def start_interview(db: Session, interview_id: int) -> Optional[models.Interview]:
    """Mark interview as started"""
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return None
    
    db_interview.status = "in_progress"
    db_interview.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_interview)
    return db_interview


def complete_interview(db: Session, interview_id: int, transcript: str) -> Optional[models.Interview]:
    """Mark interview as completed"""
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return None
    
    db_interview.status = "completed"
    db_interview.completed_at = datetime.now(timezone.utc)
    db_interview.full_transcript = transcript
    db.commit()
    db.refresh(db_interview)
    return db_interview


def update_interview_status(
    db: Session,
    interview_id: int,
    status: str,
    started_at: Optional[datetime] = None,
    completed_at: Optional[datetime] = None,
) -> Optional[models.Interview]:
    """Update interview status and optional timestamps"""
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return None

    db_interview.status = status
    if started_at is not None:
        db_interview.started_at = started_at
    if completed_at is not None:
        db_interview.completed_at = completed_at

    db.commit()
    db.refresh(db_interview)
    return db_interview


def delete_interview(db: Session, interview_id: int) -> bool:
    """Delete an interview"""
    db_interview = get_interview(db, interview_id)
    if not db_interview:
        return False

    db.delete(db_interview)
    db.commit()
    return True


# ============= Message CRUD =============

def get_next_sequence_number(db: Session, interview_id: int) -> int:
    """Get the next sequence number for messages in an interview"""
    last = (
        db.query(models.Message)
        .filter(models.Message.interview_id == interview_id)
        .order_by(models.Message.sequence_number.desc())
        .first()
    )
    return (last.sequence_number + 1) if last else 1


def create_message(db: Session, message: schemas.MessageCreate) -> models.Message:
    """Create a new message"""
    db_message = models.Message(
        interview_id=message.interview_id,
        sender=message.sender,
        content=message.content,
        sequence_number=message.sequence_number,
        audio_url=message.audio_url,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_interview_report(db: Session, interview_id: int) -> Optional[models.Report]:
    """Get the report for an interview"""
    return (
        db.query(models.Report)
        .filter(models.Report.interview_id == interview_id)
        .first()
    )


def create_interview_report(
    db: Session,
    interview_id: int,
    report_name: Optional[str],
    overall_score: Optional[float],
    performance_metrics: Optional[dict],
    strengths: Optional[list],
    improvements: Optional[list],
    summary: Optional[str],
) -> models.Report:
    """Create a new interview feedback report"""
    db_report = models.Report(
        interview_id=interview_id,
        report_name=report_name,
        overall_score=overall_score,
        performance_metrics=performance_metrics,
        strengths=strengths,
        improvements=improvements,
        summary=summary,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


def create_report_tag(
    db: Session,
    report_id: int,
    tag_name: str,
    tag_category: str,
) -> models.ReportTag:
    """Add a tag to an existing report"""
    db_tag = models.ReportTag(
        report_id=report_id,
        tag_name=tag_name,
        tag_category=tag_category,
    )
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


def get_interview_messages(db: Session, interview_id: int) -> List[models.Message]:
    """Get all messages for an interview"""
    return db.query(models.Message)\
        .filter(models.Message.interview_id == interview_id)\
        .order_by(models.Message.sequence_number)\
        .all()


# ============= Resume CRUD =============

def create_resume(db: Session, user_id: int, resume: schemas.ResumeCreate) -> models.Resume:
    """Create a new resume"""
    # If this is set as primary, unset other primary resumes
    if resume.is_primary:
        db.query(models.Resume)\
            .filter(models.Resume.user_id == user_id, models.Resume.is_primary == True)\
            .update({"is_primary": False})
    
    db_resume = models.Resume(
        user_id=user_id,
        title=resume.title,
        template=resume.template,
        full_name=resume.full_name,
        email_contact=resume.email_contact,
        phone_contact=resume.phone_contact,
        location=resume.location,
        linkedin_url=resume.linkedin_url,
        github_url=resume.github_url,
        portfolio_url=resume.portfolio_url,
        summary=resume.summary,
        education=[edu.model_dump() for edu in resume.education] if resume.education else None,
        experience=[exp.model_dump() for exp in resume.experience] if resume.experience else None,
        skills=resume.skills.model_dump() if resume.skills else None,
        projects=[proj.model_dump() for proj in resume.projects] if resume.projects else None,
        certifications=[cert.model_dump() for cert in resume.certifications] if resume.certifications else None,
        achievements=[ach.model_dump() for ach in resume.achievements] if resume.achievements else None,
        is_primary=resume.is_primary
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


def get_resume(db: Session, resume_id: int) -> Optional[models.Resume]:
    """Get resume by ID"""
    return db.query(models.Resume).filter(models.Resume.id == resume_id).first()


def get_user_resumes(db: Session, user_id: int) -> List[models.Resume]:
    """Get all resumes for a user"""
    return db.query(models.Resume)\
        .filter(models.Resume.user_id == user_id)\
        .order_by(models.Resume.updated_at.desc())\
        .all()


def get_primary_resume(db: Session, user_id: int) -> Optional[models.Resume]:
    """Get user's primary resume"""
    return db.query(models.Resume)\
        .filter(models.Resume.user_id == user_id, models.Resume.is_primary == True)\
        .first()


def update_resume(db: Session, resume_id: int, resume_update: schemas.ResumeUpdate) -> Optional[models.Resume]:
    """Update a resume"""
    db_resume = get_resume(db, resume_id)
    if not db_resume:
        return None
    
    update_data = resume_update.model_dump(exclude_unset=True)
    
    # If setting as primary, unset other primary resumes
    if update_data.get('is_primary'):
        db.query(models.Resume)\
            .filter(models.Resume.user_id == db_resume.user_id, models.Resume.is_primary == True)\
            .update({"is_primary": False})
    
    # Handle nested models
    if 'education' in update_data and update_data['education']:
        update_data['education'] = [edu.model_dump() if hasattr(edu, 'model_dump') else edu for edu in update_data['education']]
    if 'experience' in update_data and update_data['experience']:
        update_data['experience'] = [exp.model_dump() if hasattr(exp, 'model_dump') else exp for exp in update_data['experience']]
    if 'skills' in update_data and update_data['skills']:
        update_data['skills'] = update_data['skills'].model_dump() if hasattr(update_data['skills'], 'model_dump') else update_data['skills']
    if 'projects' in update_data and update_data['projects']:
        update_data['projects'] = [proj.model_dump() if hasattr(proj, 'model_dump') else proj for proj in update_data['projects']]
    if 'certifications' in update_data and update_data['certifications']:
        update_data['certifications'] = [cert.model_dump() if hasattr(cert, 'model_dump') else cert for cert in update_data['certifications']]
    if 'achievements' in update_data and update_data['achievements']:
        update_data['achievements'] = [ach.model_dump() if hasattr(ach, 'model_dump') else ach for ach in update_data['achievements']]
    
    for field, value in update_data.items():
        setattr(db_resume, field, value)
    
    db_resume.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_resume)
    return db_resume


def delete_resume(db: Session, resume_id: int) -> bool:
    """Delete a resume"""
    db_resume = get_resume(db, resume_id)
    if not db_resume:
        return False
    
    db.delete(db_resume)
    db.commit()
    return True


def set_primary_resume(db: Session, resume_id: int, user_id: int) -> Optional[models.Resume]:
    """Set a resume as primary"""
    # Unset all primary resumes for this user
    db.query(models.Resume)\
        .filter(models.Resume.user_id == user_id, models.Resume.is_primary == True)\
        .update({"is_primary": False})
    
    # Set this resume as primary
    db_resume = get_resume(db, resume_id)
    if not db_resume or db_resume.user_id != user_id:
        return None
    
    db_resume.is_primary = True
    db.commit()
    db.refresh(db_resume)
    return db_resume
