"""
Router for AI-powered interview question generation.

POST /generate-questions
  - Accepts a resume PDF upload (optional), job description, role, and
    experience level.
  - Extracts CV text with PyMuPDF.
  - Creates an Interview session record.
  - Calls the Gemma 3 question-generator service.
  - Persists the generated questions in the DB.
  - Returns { session_id, questions, role, experience_level }.
"""
import asyncio
import logging
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import auth, crud, models
from database.database import get_db
from database.schemas import InterviewCreate
from app.services.question_generator_service import get_question_generator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generate-questions", tags=["Question Generation"])


# ---------------------------------------------------------------------------
# Helper: extract text from uploaded resume file
# ---------------------------------------------------------------------------

def _extract_pdf_text_sync(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using PyMuPDF (fitz) — sync, runs in thread pool."""
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
        logger.error(f"PDF text extraction failed: {exc}")
        return ""


async def _extract_cv_text(cv_file: Optional[UploadFile], file_bytes: bytes) -> str:
    """Return text from an uploaded CV file (PDF or plain text)."""
    if not cv_file or not cv_file.filename:
        return ""

    filename_lower = cv_file.filename.lower()

    if filename_lower.endswith(".pdf"):
        # Offload blocking fitz parsing to thread pool
        return await asyncio.to_thread(_extract_pdf_text_sync, file_bytes)

    # Plain-text fallback (.txt, .md, etc.)
    try:
        return file_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("")
async def generate_questions(
    job_description: str = Form(..., description="Full job description text"),
    role: str = Form(..., description="Job role / position title"),
    experience_level: str = Form(
        ...,
        description="Candidate experience level: entry / junior / mid / senior / lead",
    ),
    cv_file: Optional[UploadFile] = File(
        None, description="Resume PDF (optional — falls back to profile CV)"
    ),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate personalised interview questions and create a session.

    **Flow:**
    1. Extract CV text from uploaded PDF (PyMuPDF) or fall back to the
       user's stored profile CV.
    2. Create a pending Interview record in the database.
    3. Call the Gemma 3 question-generator service (non-blocking).
    4. Persist the questions in interview.generated_questions.
    5. Return session_id + questions[] so the frontend can show a preview.
    """

    # ── 1. Resolve CV text ─────────────────────────────────────────────────
    cv_text = ""

    if cv_file and cv_file.filename:
        file_bytes = await cv_file.read()
        cv_text = await _extract_cv_text(cv_file, file_bytes)
        if cv_text:
            logger.info(
                f"Extracted {len(cv_text)} chars from uploaded resume "
                f"'{cv_file.filename}'."
            )

    if not cv_text:
        profile = getattr(current_user, "profile", None)
        stored_cv = getattr(profile, "cv_parsed_text", None) if profile else None
        if stored_cv:
            cv_text = stored_cv
            logger.info("Using stored CV text from user profile.")

    if not cv_text:
        cv_text = (
            f"Candidate applying for the {role} position at "
            f"{experience_level} level. No CV provided."
        )
        logger.warning("No CV text available — using stub context.")

    # ── 2. Create Interview record ─────────────────────────────────────────
    interview_schema = InterviewCreate(
        interview_type="mixed",
        job_description=job_description,
    )
    interview = crud.create_interview(
        db, user_id=current_user.id, interview=interview_schema
    )

    try:
        if hasattr(interview, "role"):
            interview.role = role
        if hasattr(interview, "experience_level"):
            interview.experience_level = experience_level
        db.commit()
        db.refresh(interview)
    except Exception as exc:
        logger.warning(f"Could not store role/experience on interview: {exc}")
        db.rollback()

    # ── 3. Generate questions with Gemma 3 (non-blocking) ─────────────────
    logger.info(
        f"Generating questions for role='{role}', experience='{experience_level}', "
        f"interview_id={interview.id}."
    )
    generator = get_question_generator()
    try:
        questions = await asyncio.wait_for(
            generator.generate_questions(
                cv_text=cv_text,
                jd_text=job_description,
                role=role,
                experience_level=experience_level,
            ),
            timeout=120,
        )
    except asyncio.TimeoutError:
        logger.error("Question generation timed out after 120s.")
        raise HTTPException(
            status_code=504,
            detail="Question generation timed out. Please try again.",
        )
    except RuntimeError as exc:
        logger.error(f"Gemma 3 model not available: {exc}")
        raise HTTPException(
            status_code=503,
            detail="AI model is not loaded. Please wait for the server to finish starting up and try again.",
        )
    except Exception as exc:
        logger.error(f"Question generation failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate questions: {str(exc)}",
        )

    # ── 4. Persist generated questions ────────────────────────────────────
    try:
        interview.generated_questions = questions
        db.commit()
        db.refresh(interview)
        logger.info(f"Stored {len(questions)} questions in interview {interview.id}.")
    except Exception as exc:
        logger.error(f"Failed to save generated questions: {exc}")
        db.rollback()

    # ── 5. Return session + questions ──────────────────────────────────────
    return {
        "session_id": interview.id,
        "questions": questions,
        "role": role,
        "experience_level": experience_level,
        "total_questions": len(questions),
    }
