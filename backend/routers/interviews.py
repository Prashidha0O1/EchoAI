from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from database.database import get_db
from database import models, schemas, crud, auth

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.post("", response_model=schemas.InterviewOut, status_code=status.HTTP_201_CREATED)
async def create_interview(
    interview: schemas.InterviewCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new interview session"""
    return crud.create_interview(db, user_id=current_user.id, interview=interview)


@router.get("", response_model=List[schemas.InterviewList])
async def list_interviews(
    skip: int = 0,
    limit: int = 20,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """List all interviews for the current user"""
    return crud.get_user_interviews(db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/{interview_id}", response_model=schemas.InterviewOut)
async def get_interview(
    interview_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific interview by ID"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this interview")
    return interview


@router.patch("/{interview_id}", response_model=schemas.InterviewOut)
async def update_interview(
    interview_id: int,
    interview_update: schemas.InterviewUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update an interview"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this interview")
    if interview.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot update a completed interview")
    
    return crud.update_interview(db, interview_id=interview_id, interview_update=interview_update)


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    interview_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an interview"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this interview")
    
    crud.delete_interview(db, interview_id=interview_id)
    return None


@router.post("/{interview_id}/start", response_model=schemas.InterviewOut)
async def start_interview(
    interview_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Start an interview session"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if interview.status != "pending":
        raise HTTPException(status_code=400, detail=f"Interview is already {interview.status}")
    
    return crud.update_interview_status(
        db, 
        interview_id=interview_id, 
        status="in_progress",
        started_at=datetime.now(timezone.utc)
    )


@router.post("/{interview_id}/end", response_model=schemas.InterviewOut)
async def end_interview(
    interview_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """End an interview session"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")
    
    return crud.update_interview_status(
        db, 
        interview_id=interview_id, 
        status="completed",
        completed_at=datetime.now(timezone.utc)
    )


@router.get("/{interview_id}/messages", response_model=List[schemas.MessageOut])
async def get_interview_messages(
    interview_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all messages for an interview"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return crud.get_interview_messages(db, interview_id=interview_id)


@router.post("/{interview_id}/messages", response_model=schemas.MessageOut, status_code=status.HTTP_201_CREATED)
async def add_interview_message(
    interview_id: int,
    message: schemas.MessageBase,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Add a message to an interview"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")
    
    # Auto-assign sequence number
    sequence_number = crud.get_next_sequence_number(db, interview_id)
    message_create = schemas.MessageCreate(
        interview_id=interview_id,
        sender=message.sender,
        content=message.content,
        sequence_number=sequence_number,
        audio_url=message.audio_url
    )
    
    return crud.create_message(db, message=message_create)


@router.get("/{interview_id}/report", response_model=schemas.ReportOut)
async def get_interview_report(
    interview_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get the report for an interview"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    report = crud.get_interview_report(db, interview_id=interview_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not generated yet")

    return report


@router.post("/{interview_id}/report", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
async def generate_interview_report(
    interview_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate (or regenerate) the AI feedback report for a completed interview"""
    interview = crud.get_interview(db, interview_id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    if interview.status != "completed":
        raise HTTPException(status_code=400, detail="Interview must be completed before generating a report")

    # Build transcript from stored messages
    messages = crud.get_interview_messages(db, interview_id=interview_id)
    if not messages:
        raise HTTPException(status_code=400, detail="No transcript found for this interview")

    transcript_lines = []
    for msg in messages:
        label = "Interviewer" if msg.sender == "ai" else "Candidate"
        transcript_lines.append(f"{label}: {msg.content}")
    transcript = "\n".join(transcript_lines)

    # Generate feedback using Gemma 3
    from app.services.feedback_service import get_feedback_service
    feedback_svc = get_feedback_service()
    result = await feedback_svc.generate(
        transcript=transcript,
        role=getattr(interview, "role", None) or "Software Engineer",
        interview_type=interview.interview_type or "technical",
    )

    # Delete existing report if regenerating
    existing = crud.get_interview_report(db, interview_id=interview_id)
    if existing:
        db.delete(existing)
        db.commit()

    # Persist the new report
    report = crud.create_interview_report(
        db,
        interview_id=interview_id,
        report_name=f"Interview Report — {getattr(interview, 'role', None) or 'General'}",
        overall_score=result["overall_score"],
        performance_metrics=result["performance_metrics"],
        strengths=result["strengths"],
        improvements=result["improvements"],
        summary=result["summary"],
    )

    # Persist tags
    for tag_data in result.get("tags", []):
        crud.create_report_tag(
            db,
            report_id=report.id,
            tag_name=tag_data.get("tag_name", ""),
            tag_category=tag_data.get("tag_category", "neutral"),
        )

    db.refresh(report)
    return report
