import asyncio
import logging
import os
import tempfile

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database.database import get_db
from database import models, schemas, crud, auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["User Profile"])

# Directory for storing uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
CV_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "cv")
PROFILE_PIC_DIR = os.path.join(UPLOAD_DIR, "profile_pictures")

os.makedirs(CV_UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILE_PIC_DIR, exist_ok=True)


def _extract_pdf_text_sync(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using PyMuPDF — runs in thread pool."""
    try:
        import fitz  # PyMuPDF

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            doc = fitz.open(tmp_path)
            pages_text = [page.get_text() for page in doc]
            doc.close()
            return "\n".join(pages_text).strip()
        finally:
            os.unlink(tmp_path)
    except ImportError:
        logger.warning("PyMuPDF (fitz) not installed — cannot parse PDF.")
        return ""
    except Exception as exc:
        logger.error("PDF text extraction failed: %s", exc)
        return ""


async def _extract_text_from_cv(file_bytes: bytes, filename: str) -> str:
    """Return plain text from an uploaded CV file (PDF, DOCX, or plain text)."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return await asyncio.to_thread(_extract_pdf_text_sync, file_bytes)

    if lower.endswith((".docx", ".doc")):
        try:
            import fitz  # PyMuPDF handles DOCX too via open with filetype
            with tempfile.NamedTemporaryFile(suffix=os.path.splitext(lower)[1], delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                doc = fitz.open(tmp_path)
                pages_text = [page.get_text() for page in doc]
                doc.close()
                return "\n".join(pages_text).strip()
            finally:
                os.unlink(tmp_path)
        except Exception as exc:
            logger.warning("DOCX text extraction failed: %s", exc)
            return ""

    # Plain-text fallback (.txt, etc.)
    try:
        return file_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


@router.get("", response_model=schemas.UserProfileOut)
async def get_profile(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's profile."""
    profile = crud.get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("", response_model=schemas.UserProfileOut)
async def update_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile."""
    profile = crud.update_user_profile(db, current_user.id, profile_update)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/cv", response_model=schemas.UserProfileOut)
async def upload_cv(
    cv_file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload or update CV file.
    Accepted formats: PDF, DOCX, DOC, TXT
    """
    allowed_extensions = {".pdf", ".docx", ".doc", ".txt"}
    file_extension = os.path.splitext(cv_file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}",
        )

    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    content = await cv_file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

    cv_filename = f"cv_{current_user.id}{file_extension}"
    cv_path = os.path.join(CV_UPLOAD_DIR, cv_filename)

    # Remove old CV if exists
    profile = crud.get_user_profile(db, current_user.id)
    if profile and profile.cv_file_path and os.path.exists(profile.cv_file_path):
        await asyncio.to_thread(os.remove, profile.cv_file_path)

    # Save new CV asynchronously
    async with aiofiles.open(cv_path, "wb") as buffer:
        await buffer.write(content)

    # Parse CV text so it can be reused for interview question generation
    parsed_text = await _extract_text_from_cv(content, cv_file.filename)
    if parsed_text:
        logger.info("Parsed %d chars from uploaded CV '%s'.", len(parsed_text), cv_file.filename)

    profile = crud.update_user_profile(
        db,
        current_user.id,
        schemas.UserProfileUpdate(),
        cv_file_path=cv_path,
        cv_parsed_text=parsed_text or None,
    )

    return profile


@router.post("/picture", response_model=schemas.UserProfileOut)
async def upload_profile_picture(
    picture: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or update profile picture."""
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_extension = os.path.splitext(picture.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {', '.join(allowed_extensions)}",
        )

    MAX_SIZE = 2 * 1024 * 1024  # 2MB
    content = await picture.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Image size exceeds 2MB limit")

    pic_filename = f"profile_{current_user.id}{file_extension}"
    pic_path = os.path.join(PROFILE_PIC_DIR, pic_filename)
    pic_url = f"/uploads/profile_pictures/{pic_filename}"

    # Remove old picture if exists (handle both filesystem and URL forms)
    profile = crud.get_user_profile(db, current_user.id)
    if profile and profile.profile_picture:
        old = profile.profile_picture
        old_fs = old if os.path.isabs(old) else os.path.join(
            os.path.dirname(os.path.dirname(__file__)), old.lstrip("/")
        )
        if os.path.exists(old_fs):
            await asyncio.to_thread(os.remove, old_fs)

    # Save new picture asynchronously
    async with aiofiles.open(pic_path, "wb") as buffer:
        await buffer.write(content)

    profile = crud.update_user_profile(
        db,
        current_user.id,
        schemas.UserProfileUpdate(),
        profile_picture=pic_url,
    )

    return profile


@router.delete("/cv", response_model=schemas.MessageResponse)
async def delete_cv(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the current user's CV."""
    profile = crud.get_user_profile(db, current_user.id)
    if not profile or not profile.cv_file_path:
        raise HTTPException(status_code=404, detail="No CV found")

    if os.path.exists(profile.cv_file_path):
        await asyncio.to_thread(os.remove, profile.cv_file_path)

    profile.cv_file_path = None
    profile.cv_parsed_text = None
    db.commit()

    return {"message": "CV deleted successfully", "success": True}
