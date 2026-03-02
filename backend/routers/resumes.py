"""Resume builder API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from database import models, schemas, crud, auth
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resumes", tags=["Resume Builder"])


@router.post("", response_model=schemas.ResumeOut, status_code=status.HTTP_201_CREATED)
async def create_resume(
    resume: schemas.ResumeCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new resume"""
    db_resume = crud.create_resume(db, user_id=current_user.id, resume=resume)
    return db_resume


@router.get("", response_model=List[schemas.ResumeOut])
async def list_resumes(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all resumes for the current user"""
    resumes = crud.get_user_resumes(db, user_id=current_user.id)
    return resumes


@router.get("/primary", response_model=schemas.ResumeOut)
async def get_primary_resume(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's primary resume"""
    resume = crud.get_primary_resume(db, user_id=current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No primary resume found. Please create a resume first."
        )
    return resume


@router.get("/{resume_id}", response_model=schemas.ResumeOut)
async def get_resume(
    resume_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific resume"""
    resume = crud.get_resume(db, resume_id=resume_id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Ensure user owns this resume
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resume"
        )
    
    return resume


@router.put("/{resume_id}", response_model=schemas.ResumeOut)
async def update_resume(
    resume_id: int,
    resume_update: schemas.ResumeUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a resume"""
    # Check ownership
    resume = crud.get_resume(db, resume_id=resume_id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this resume"
        )
    
    updated_resume = crud.update_resume(db, resume_id=resume_id, resume_update=resume_update)
    return updated_resume


@router.delete("/{resume_id}", response_model=schemas.MessageResponse)
async def delete_resume(
    resume_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a resume"""
    # Check ownership
    resume = crud.get_resume(db, resume_id=resume_id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this resume"
        )
    
    success = crud.delete_resume(db, resume_id=resume_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete resume"
        )
    
    return {
        "message": "Resume deleted successfully",
        "success": True
    }


@router.post("/{resume_id}/set-primary", response_model=schemas.ResumeOut)
async def set_primary_resume(
    resume_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Set a resume as primary"""
    resume = crud.set_primary_resume(db, resume_id=resume_id, user_id=current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or you don't have permission"
        )
    
    return resume


@router.get("/{resume_id}/export/pdf")
async def export_resume_pdf(
    resume_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Export resume as PDF"""
    resume = crud.get_resume(db, resume_id=resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Generate PDF
    pdf_bytes = await ResumeService.generate_pdf(resume)
    
    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=resume_{resume.id}_{resume.title.replace(' ', '_')}.pdf"
        }
    )


@router.get("/{resume_id}/preview")
async def preview_resume(
    resume_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get resume preview HTML"""
    resume = crud.get_resume(db, resume_id=resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    html = ResumeService.generate_html(resume)
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)
