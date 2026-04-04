"""ATS Resume Checker router — POST /ats/check"""
import asyncio
import logging
import os
import tempfile

import aiofiles
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

    Returns a match **percentage** (0–100), missing keywords, recommendations, and feedback.
    """
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

    # Write upload to a temporary file so DocumentParser can read it by path
    file_bytes = await resume.read()
    try:
        # NamedTemporaryFile is sync — run in thread pool
        def _write_tmp() -> str:
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext.lower()) as tmp:
                tmp.write(file_bytes)
                return tmp.name

        tmp_path = await asyncio.to_thread(_write_tmp)
    except Exception as exc:
        logger.error(f"Failed to save uploaded resume: {exc}")
        raise HTTPException(status_code=500, detail="Failed to process uploaded file.")

    try:
        # Parse resume text — offloaded to thread pool inside parse_document_async
        resume_text = await DocumentParser.parse_document_async(tmp_path)
        if not resume_text.strip():
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not extract text from the uploaded resume. "
                    "Ensure the file is not image-only or password-protected."
                ),
            )

        ats = get_ats_service()
        if not ats.is_loaded:
            raise HTTPException(
                status_code=503,
                detail="ATS model is not available. Please try again later.",
            )

        # Run BERT inference — offloaded to thread pool, with timeout
        try:
            result = await asyncio.wait_for(
                ats.compute_ats_score_async(resume_text, job_description),
                timeout=60,
            )
        except asyncio.TimeoutError:
            logger.warning("ATS scoring timed out after 60s.")
            raise HTTPException(
                status_code=504,
                detail="ATS scoring timed out. Please try again.",
            )
        gaps = ats.analyze_resume_gaps(resume_text, job_description, result["percentage"])

        return {
            "percentage": result["percentage"],
            "resume_filename": resume.filename,
            "missing_keywords": gaps["missing_keywords"],
            "recommendations": gaps["recommendations"],
            "feedback": gaps["feedback"],
        }

    finally:
        try:
            await asyncio.to_thread(os.unlink, tmp_path)
        except OSError:
            pass
