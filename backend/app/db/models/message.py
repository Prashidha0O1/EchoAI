"""Message database model"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Message(Base):
    """Individual messages in an interview conversation"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(10), nullable=False)  # 'ai' or 'user'
    content = Column(Text, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    audio_url = Column(String(255), nullable=True)  # Optional audio file path
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    interview = relationship("Interview", back_populates="messages")

    def __repr__(self):
        return f"Message(id={self.id}, interview_id={self.interview_id}, sender={self.sender})"
