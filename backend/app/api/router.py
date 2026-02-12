"""Main API router aggregating all v1 routes"""
from fastapi import APIRouter
from app.api.v1.auth.routes import router as auth_router
from app.api.v1.interviews.routes import router as interviews_router
from app.api.v1.profile.routes import router as profile_router

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(interviews_router)
api_router.include_router(profile_router)
