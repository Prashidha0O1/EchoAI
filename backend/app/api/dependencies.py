"""Shared API dependencies"""
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user, get_current_admin_user, get_current_active_user
from app.db import models

# Re-export commonly used dependencies
__all__ = [
    "get_db",
    "get_current_user",
    "get_current_admin_user",
    "get_current_active_user",
]
