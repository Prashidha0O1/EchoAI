"""Authentication routes"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
import os
import shutil

from app.db.session import get_db
from app.db import models, schemas
from app.db.repositories import UserRepository, UserProfileRepository
from app.core import security
from app.core.config import settings
from app.utils.redis_client import (
    check_login_allowed,
    increment_login_attempts,
    reset_login_attempts,
    store_password_reset_token,
    verify_password_reset_token,
    delete_password_reset_token
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Ensure upload directories exist
os.makedirs(settings.cv_upload_dir, exist_ok=True)


@router.post("/register", response_model=schemas.UserOut)
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    cv_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Register a new user with optional CV upload.
    """
    # Normalize email
    email = email.lower().strip()

    # Check if email already exists
    if UserRepository.get_by_email(db, email=email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists
    if UserRepository.get_by_username(db, username=username):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Validate password length
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Create user
    user_create = schemas.UserCreate(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    db_user = UserRepository.create(db=db, user=user_create)
    
    # Handle CV upload if provided
    if cv_file:
        # Save the CV file
        file_extension = os.path.splitext(cv_file.filename)[1]
        cv_filename = f"{db_user.id}_{cv_file.filename}"
        cv_path = os.path.join(settings.cv_upload_dir, cv_filename)
        
        with open(cv_path, "wb") as buffer:
            shutil.copyfileobj(cv_file.file, buffer)
        
        # Update profile with CV path
        profile = UserProfileRepository.get(db, db_user.id)
        if profile:
            profile.cv_file_path = cv_path
            db.commit()
    
    return db_user


@router.post("/login", response_model=schemas.TokenWithUser)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with email/username and password.
    Rate limited: 5 attempts, then 5 minute lockout.
    """
    email = form_data.username.lower().strip()  # OAuth2 uses 'username' field; normalize email

    # Check rate limiting
    is_allowed, remaining = check_login_allowed(email)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {remaining} seconds."
        )
    
    # Find user by email or username
    user = UserRepository.get_by_email(db, email=email)
    if not user:
        user = UserRepository.get_by_username(db, username=email)
    
    # Verify credentials
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        is_locked, attempts_or_lockout = increment_login_attempts(email)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked. Try again in {attempts_or_lockout} seconds."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect email or password. {attempts_or_lockout} attempts remaining.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Reset login attempts on successful login
    reset_login_attempts(email)
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create access token
    access_token = security.create_access_token(
        data={"sub": user.email, "user_id": user.id}
    )

    # Load profile so it's included in the response
    profile = UserProfileRepository.get(db, user.id)

    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserWithProfile)
async def get_current_user_info(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current authenticated user with profile"""
    # Eagerly load profile
    profile = UserProfileRepository.get(db, current_user.id)
    return current_user


@router.post("/forgot-password", response_model=schemas.MessageResponse)
async def forgot_password(
    request: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset token.
    In production, this would send an email with the reset link.
    """
    user = UserRepository.get_by_email(db, email=request.email)
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, a reset link has been sent.", "success": True}
    
    # Generate reset token
    token = security.generate_password_reset_token()
    
    # Store token in Redis
    store_password_reset_token(request.email, token)
    
    # TODO: Send email with reset link
    # For now, return the token (ONLY FOR DEVELOPMENT)
    return {
        "message": f"Password reset token: {token}",  # Remove in production
        "success": True
    }


@router.post("/reset-password", response_model=schemas.MessageResponse)
async def reset_password(
    request: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password using the reset token"""
    # Verify token
    email = verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Find user
    user = UserRepository.get_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = security.get_password_hash(request.new_password)
    db.commit()
    
    # Delete used token
    delete_password_reset_token(request.token)
    
    # Reset any login lockouts
    reset_login_attempts(email)
    
    return {"message": "Password has been reset successfully", "success": True}
