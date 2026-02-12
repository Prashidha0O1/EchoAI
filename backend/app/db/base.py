"""Base imports for Alembic migrations"""
from app.db.session import Base

# Import all models for Alembic to detect
from app.db.models.user import User, UserProfile
from app.db.models.interview import Interview
from app.db.models.message import Message
from app.db.models.feedback import Report, ReportTag

__all__ = ["Base", "User", "UserProfile", "Interview", "Message", "Report", "ReportTag"]
