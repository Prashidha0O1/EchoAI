"""User profile routes"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil

from app.db.session import get_db
from app.db import models, schemas
from app.db.repositories import UserProfileRepository
from app.core import security
from app.core.config import settings

router = APIRouter(prefix="/profile", tags=["User Profile"])

# Ensure directories exist
os.makedirs(settings.cv_upload_dir, exist_ok=True)
os.makedirs(settings.profile_picture_dir, exist_ok=True)


@router.get("", response_model=schemas.UserProfileOut)
async def get_profile(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's profile"""
    profile = UserProfileRepository.get(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("", response_model=schemas.UserProfileOut)
async def update_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's profile"""
    profile = UserProfileRepository.update(db, current_user.id, profile_update)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/cv", response_model=schemas.UserProfileOut)
async def upload_cv(
    cv_file: UploadFile = File(...),
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload or update CV file.
    Accepted formats: PDF, DOCX, DOC, TXT
    """
    # Validate file type
    file_extension = os.path.splitext(cv_file.filename)[1].lower()
    
    if file_extension not in settings.ALLOWED_CV_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_CV_EXTENSIONS)}"
        )
    
    # Validate file size
    content = await cv_file.read()
    if len(content) > settings.MAX_CV_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Reset file pointer
    await cv_file.seek(0)
    
    # Generate unique filename
    cv_filename = f"cv_{current_user.id}{file_extension}"
    cv_path = os.path.join(settings.cv_upload_dir, cv_filename)
    
    # Remove old CV if exists
    profile = UserProfileRepository.get(db, current_user.id)
    if profile and profile.cv_file_path and os.path.exists(profile.cv_file_path):
        os.remove(profile.cv_file_path)
    
    # Save new CV
    with open(cv_path, "wb") as buffer:
        shutil.copyfileobj(cv_file.file, buffer)
    
    # Update profile
    profile = UserProfileRepository.update(
        db,
        current_user.id,
        schemas.UserProfileUpdate(),
        cv_file_path=cv_path
    )
    
    return profile


@router.post("/picture", response_model=schemas.UserProfileOut)
async def upload_profile_picture(
    picture: UploadFile = File(...),
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Upload or update profile picture"""
    # Validate file type
    file_extension = os.path.splitext(picture.filename)[1].lower()
    
    if file_extension not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Validate file size
    content = await picture.read()
    if len(content) > settings.MAX_PROFILE_PIC_SIZE:
        raise HTTPException(status_code=400, detail="Image size exceeds 2MB limit")
    
    await picture.seek(0)
    
    # Generate filename
    pic_filename = f"profile_{current_user.id}{file_extension}"
    pic_path = os.path.join(settings.profile_picture_dir, pic_filename)
    
    # Remove old picture if exists
    profile = UserProfileRepository.get(db, current_user.id)
    if profile and profile.profile_picture and os.path.exists(profile.profile_picture):
        os.remove(profile.profile_picture)
    
    # Save new picture
    with open(pic_path, "wb") as buffer:
        shutil.copyfileobj(picture.file, buffer)
    
    # Update profile
    profile = UserProfileRepository.update(
        db,
        current_user.id,
        schemas.UserProfileUpdate(),
        profile_picture=pic_path
    )
    
    return profile


@router.delete("/cv", response_model=schemas.MessageResponse)
async def delete_cv(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete the current user's CV"""
    profile = UserProfileRepository.get(db, current_user.id)
    if not profile or not profile.cv_file_path:
        raise HTTPException(status_code=404, detail="No CV found")
    
    # Delete file
    if os.path.exists(profile.cv_file_path):
        os.remove(profile.cv_file_path)
    
    # Clear path in database
    profile.cv_file_path = None
    profile.cv_parsed_text = None
    db.commit()
    
    return {"message": "CV deleted successfully", "success": True}
