"""Message repository"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.db.models.message import Message
from app.db.schemas import MessageCreate


class MessageRepository:
    """Repository for Message operations"""
    
    @staticmethod
    def create(db: Session, message: MessageCreate) -> Message:
        """Create a new message"""
        db_message = Message(**message.model_dump())
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        return db_message
    
    @staticmethod
    def get_interview_messages(db: Session, interview_id: int) -> List[Message]:
        """Get all messages for an interview"""
        return db.query(Message)\
            .filter(Message.interview_id == interview_id)\
            .order_by(Message.sequence_number)\
            .all()
    
    @staticmethod
    def get_next_sequence_number(db: Session, interview_id: int) -> int:
        """Get the next sequence number for a message"""
        last_message = db.query(Message)\
            .filter(Message.interview_id == interview_id)\
            .order_by(desc(Message.sequence_number))\
            .first()
        return (last_message.sequence_number + 1) if last_message else 1
