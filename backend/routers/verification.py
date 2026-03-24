"""Email verification endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

from database.database import get_db
from database import models, schemas, crud, auth
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verification", tags=["Email Verification"])


@router.post("/send", response_model=schemas.MessageResponse)
async def send_verification_code(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a 6-digit verification code to user's email
    Rate limited: Can only send once every 2 minutes
    """
    # Check if already verified
    if current_user.email_verified:
        return {
            "message": "Email is already verified",
            "success": True
        }
    
    # Check rate limiting (can't send too frequently)
    if current_user.verification_code_created_at:
        time_since_last = datetime.now(timezone.utc) - current_user.verification_code_created_at
        if time_since_last.total_seconds() < 120:  # 2 minutes
            remaining = 120 - int(time_since_last.total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting a new code"
            )
    
    # Generate new code
    code = EmailService.generate_verification_code()
    
    # Save code to database
    crud.set_verification_code(db, current_user.id, code)
    
    # Always log code to console (useful during development / SMTP issues)
    logger.info(f"")
    logger.info(f"{'='*50}")
    logger.info(f"  VERIFICATION CODE for {current_user.email}")
    logger.info(f"  CODE: {code}")
    logger.info(f"{'='*50}")
    logger.info(f"")

    # Attempt to send email
    user_name = current_user.first_name or current_user.username
    email_sent = await EmailService.send_verification_code(
        to_email=current_user.email,
        code=code,
        user_name=user_name,
    )

    if email_sent:
        return {
            "message": f"Verification code sent to {current_user.email}. Check your inbox!",
            "success": True
        }
    else:
        # SMTP failed — return the code directly in the response so dev can still verify
        logger.warning("SMTP failed. Returning code in response body (dev mode).")
        return {
            "message": f"Email could not be sent. Use this code to verify: {code}",
            "success": True,
            "dev_code": code   # Only present when SMTP is not working
        }


@router.post("/verify", response_model=schemas.MessageResponse)
async def verify_email(
    verification: schemas.EmailVerificationCodeSubmit,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify email using 6-digit code
    """
    # Check if already verified
    if current_user.email_verified:
        return {
            "message": "Email is already verified",
            "success": True
        }
    
    # Check if code exists
    if not current_user.verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found. Please request a new code."
        )
    
    # Check if code expired
    if EmailService.is_code_expired(current_user.verification_code_created_at):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )
    
    # Verify code
    if current_user.verification_code != verification.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again."
        )
    
    # Mark as verified
    crud.set_email_verified(db, current_user.id, verified=True)
    
    return {
        "message": "Email verified successfully! 🎉",
        "success": True
    }


@router.get("/status")
async def get_verification_status(
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get current verification status"""
    return {
        "email": current_user.email,
        "verified": current_user.email_verified,
        "code_requested": current_user.verification_code is not None,
        "code_expires_in_minutes": VERIFICATION_CODE_EXPIRE_MINUTES if current_user.verification_code else None
    }


# For development only - remove in production
@router.get("/debug/code")
async def debug_get_code(
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    DEBUG ONLY: Get verification code without email
    Remove this endpoint in production!
    """
    if not current_user.verification_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verification code found. Request one first."
        )
    
    return {
        "code": current_user.verification_code,
        "created_at": current_user.verification_code_created_at,
        "expired": EmailService.is_code_expired(current_user.verification_code_created_at)
    }


from app.services.email_service import VERIFICATION_CODE_EXPIRE_MINUTES
