from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil

from database.database import get_db
from database import models, schemas, crud, auth

router = APIRouter(prefix="/profile", tags=["User Profile"])

# Directory for storing uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
CV_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "cv")
PROFILE_PIC_DIR = os.path.join(UPLOAD_DIR, "profile_pictures")

# Ensure directories exist
os.makedirs(CV_UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILE_PIC_DIR, exist_ok=True)


@router.get("", response_model=schemas.UserProfileOut)
async def get_profile(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's profile"""
    profile = crud.get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("", response_model=schemas.UserProfileOut)
async def update_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's profile"""
    profile = crud.update_user_profile(db, current_user.id, profile_update)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/cv", response_model=schemas.UserProfileOut)
async def upload_cv(
    cv_file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload or update CV file.
    Accepted formats: PDF, DOCX, DOC, TXT
    """
    # Validate file type
    allowed_extensions = {".pdf", ".docx", ".doc", ".txt"}
    file_extension = os.path.splitext(cv_file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 5MB)
    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    content = await cv_file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Reset file pointer
    await cv_file.seek(0)
    
    # Generate unique filename
    cv_filename = f"cv_{current_user.id}{file_extension}"
    cv_path = os.path.join(CV_UPLOAD_DIR, cv_filename)
    
    # Remove old CV if exists
    profile = crud.get_user_profile(db, current_user.id)
    if profile and profile.cv_file_path and os.path.exists(profile.cv_file_path):
        os.remove(profile.cv_file_path)
    
    # Save new CV
    with open(cv_path, "wb") as buffer:
        shutil.copyfileobj(cv_file.file, buffer)
    
    # Update profile
    profile = crud.update_user_profile(
        db, 
        current_user.id, 
        schemas.UserProfileUpdate(),
        cv_file_path=cv_path
    )
    
    return profile


@router.post("/picture", response_model=schemas.UserProfileOut)
async def upload_profile_picture(
    picture: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Upload or update profile picture"""
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_extension = os.path.splitext(picture.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid image type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 2MB)
    MAX_SIZE = 2 * 1024 * 1024
    content = await picture.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Image size exceeds 2MB limit")
    
    await picture.seek(0)
    
    # Generate filename
    pic_filename = f"profile_{current_user.id}{file_extension}"
    pic_path = os.path.join(PROFILE_PIC_DIR, pic_filename)
    
    # Remove old picture if exists
    profile = crud.get_user_profile(db, current_user.id)
    if profile and profile.profile_picture and os.path.exists(profile.profile_picture):
        os.remove(profile.profile_picture)
    
    # Save new picture
    with open(pic_path, "wb") as buffer:
        shutil.copyfileobj(picture.file, buffer)
    
    # Update profile
    profile = crud.update_user_profile(
        db, 
        current_user.id, 
        schemas.UserProfileUpdate(),
        profile_picture=pic_path
    )
    
    return profile


@router.delete("/cv", response_model=schemas.MessageResponse)
async def delete_cv(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete the current user's CV"""
    profile = crud.get_user_profile(db, current_user.id)
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
