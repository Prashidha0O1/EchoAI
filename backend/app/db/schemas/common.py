"""Common response schemas"""
from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True
