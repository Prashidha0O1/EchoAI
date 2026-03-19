# Routers package
from .auth import router as auth_router
from .interviews import router as interviews_router
from .profile import router as profile_router
from .verification import router as verification_router
from .resumes import router as resumes_router
from .ats import router as ats_router
from .question_generator import router as question_generator_router

__all__ = [
    "auth_router",
    "interviews_router",
    "profile_router",
    "verification_router",
    "resumes_router",
    "ats_router",
    "question_generator_router",
]
