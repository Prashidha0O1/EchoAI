import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database.database import get_db
from database import models, schemas, crud, auth
from utils.redis_client import (
    check_login_allowed,
    increment_login_attempts,
    reset_login_attempts,
    store_password_reset_token,
    verify_password_reset_token,
    delete_password_reset_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Directory for storing uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
CV_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "cv")
os.makedirs(CV_UPLOAD_DIR, exist_ok=True)


@router.post("/register", response_model=schemas.UserOut)
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    cv_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Register a new user with optional CV upload."""
    email = email.lower().strip()

    if crud.get_user_by_email(db, email=email):
        raise HTTPException(status_code=400, detail="Email already registered")

    if crud.get_user_by_username(db, username=username):
        raise HTTPException(status_code=400, detail="Username already taken")

    if len(password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )

    user_create = schemas.UserCreate(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    db_user = crud.create_user(db=db, user=user_create)

    # Handle CV upload if provided
    if cv_file:
        cv_filename = f"{db_user.id}_{cv_file.filename}"
        cv_path = os.path.join(CV_UPLOAD_DIR, cv_filename)

        file_bytes = await cv_file.read()
        async with aiofiles.open(cv_path, "wb") as buffer:
            await buffer.write(file_bytes)

        profile = crud.get_user_profile(db, db_user.id)
        if profile:
            profile.cv_file_path = cv_path
            db.commit()

    return db_user


@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login with email/username and password.
    Rate limited: 5 attempts, then 5 minute lockout.
    """
    email = form_data.username.lower().strip()

    # Check rate limiting
    is_allowed, remaining = await check_login_allowed(email)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {remaining} seconds.",
        )

    user = crud.get_user_by_email(db, email=email)
    if not user:
        user = crud.get_user_by_username(db, username=email)

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        is_locked, attempts_or_lockout = await increment_login_attempts(email)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked. Try again in {attempts_or_lockout} seconds.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect email or password. {attempts_or_lockout} attempts remaining.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    await reset_login_attempts(email)

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token = auth.create_access_token(
        data={"sub": user.email, "user_id": user.id}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserWithProfile)
async def get_current_user_info(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Get current authenticated user with profile."""
    crud.get_user_profile(db, current_user.id)
    return current_user


@router.patch("/me", response_model=schemas.UserWithProfile)
async def update_current_user(
    update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Update first_name / last_name on the authenticated user."""
    if update.first_name is not None:
        current_user.first_name = update.first_name.strip() or None
    if update.last_name is not None:
        current_user.last_name = update.last_name.strip() or None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password", response_model=schemas.MessageResponse)
async def forgot_password(
    request: schemas.PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset token."""
    user = crud.get_user_by_email(db, email=request.email)

    # Always return success to prevent email enumeration
    if not user:
        return {
            "message": "If an account exists with this email, a reset link has been sent.",
            "success": True,
        }

    token = auth.generate_password_reset_token()
    await store_password_reset_token(request.email, token)

    from app.services.email_service import EmailService
    email_sent = await EmailService.send_password_reset_email(
        to_email=request.email,
        reset_token=token,
        user_name=user.first_name or user.username,
    )
    if not email_sent:
        logger.warning(f"Password reset email failed to send to {request.email}")

    return {
        "message": "If an account exists with this email, a reset link has been sent.",
        "success": True,
    }


@router.post("/reset-password", response_model=schemas.MessageResponse)
async def reset_password(
    request: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    """Reset password using the reset token."""
    email = await verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.hashed_password = auth.get_password_hash(request.new_password)
    db.commit()

    await delete_password_reset_token(request.token)
    await reset_login_attempts(email)

    return {"message": "Password has been reset successfully", "success": True}


@router.post("/change-password", response_model=schemas.MessageResponse)
async def change_password(
    request: schemas.PasswordChangeRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the currently authenticated user."""
    # Verify old password
    if not auth.verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    # Confirm new passwords match
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirm password do not match.",
        )

    # Ensure new password differs from old
    if request.old_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password.",
        )

    current_user.hashed_password = auth.get_password_hash(request.new_password)
    db.commit()

    return {"message": "Password changed successfully.", "success": True}
