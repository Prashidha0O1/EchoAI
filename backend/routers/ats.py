"""ATS Resume Checker router — POST /ats/check"""
import os
import tempfile
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from database import auth, models
from app.services.document_parser import DocumentParser
from app.services.ats_service import get_ats_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ats", tags=["ATS Resume Checker"])

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@router.post("/check")
async def check_ats_score(
    resume: UploadFile = File(..., description="CV/Resume file (PDF or DOCX)"),
    job_description: str = Form(..., description="Job description text"),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Upload a resume and provide a job description to receive an ATS match score.

    - **resume**: PDF or DOCX file of the candidate's CV.
    - **job_description**: Plain-text job description to match against.

    Returns a match **percentage** (0–100) and a raw **score** (0–1).
    """
    # Validate file type
    _, ext = os.path.splitext(resume.filename or "")
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload a PDF or DOCX file.",
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description must not be empty.",
        )

    # Save upload to a temporary file so DocumentParser can read it by path
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=ext.lower()
        ) as tmp:
            tmp.write(await resume.read())
            tmp_path = tmp.name
    except Exception as exc:
        logger.error(f"Failed to save uploaded resume: {exc}")
        raise HTTPException(status_code=500, detail="Failed to process uploaded file.")

    try:
        # Parse resume text from file
        resume_text = DocumentParser.parse_document(tmp_path)
        if not resume_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from the uploaded resume. "
                       "Ensure the file is not image-only or password-protected.",
            )

        # Run BERT inference
        ats = get_ats_service()
        if not ats.is_loaded:
            raise HTTPException(
                status_code=503,
                detail="ATS model is not available. Please try again later.",
            )

        result = ats.compute_ats_score(resume_text, job_description)
        return {
            "score": result["score"],
            "percentage": result["percentage"],
            "resume_filename": resume.filename,
        }

    finally:
        # Always clean up the temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
