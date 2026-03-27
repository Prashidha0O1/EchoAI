"""WebSocket handler for real-time interview sessions"""
import logging
from datetime import datetime, timezone
from typing import Optional
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.repositories import InterviewRepository, MessageRepository
from app.db.schemas import MessageCreate
from app.core.security import decode_token
from app.services.llm_service import SimpleLLMService
from app.services.transcript_service import TranscriptService
from speech_pipeline.stt.whisper_stt import WhisperSTT
from speech_pipeline.tts.pyttsx3_tts import Pyttsx3TTS
from database import models

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services (shared across connections)
try:
    stt_service = WhisperSTT()
    tts_service = Pyttsx3TTS()
    transcript_service = TranscriptService()
    logger.info("WebSocket services initialized successfully")
except Exception as e:
    logger.error(f"Error initializing WebSocket services: {e}")
    stt_service = None
    tts_service = None
    transcript_service = None


class InterviewSession:
    """Manages a single interview WebSocket session"""
    
    def __init__(
        self,
        websocket: WebSocket,
        interview_id: int,
        user_id: int,
        db: Session
    ):
        self.websocket = websocket
        self.interview_id = interview_id
        self.user_id = user_id
        self.db = db
        self.llm_service: Optional[SimpleLLMService] = None
        self.is_active = False
    
    async def initialize(self) -> bool:
        """Initialize the session by loading interview context"""
        try:
            # Get interview from database
            interview = InterviewRepository.get(self.db, self.interview_id)
            if not interview:
                await self.websocket.send_json({
                    "type": "error",
                    "message": "Interview not found"
                })
                return False
            
            # Check authorization
            if interview.user_id != self.user_id:
                await self.websocket.send_json({
                    "type": "error",
                    "message": "Not authorized for this interview"
                })
                return False
            
            # Check interview status
            if interview.status != "in_progress":
                await self.websocket.send_json({
                    "type": "error",
                    "message": f"Interview is {interview.status}, not in progress"
                })
                return False
            
            # Load user profile for CV
            user = self.db.query(models.User).filter(models.User.id == self.user_id).first()
            if not user or not user.profile:
                cv_text = "No CV uploaded"
            else:
                cv_text = user.profile.cv_parsed_text or "No CV text available"
            
            jd_text = interview.job_description or "No job description provided"
            
            # Cache context in Redis
            await transcript_service.cache_interview_context(
                self.interview_id,
                cv_text,
                jd_text
            )
            
            # Initialize LLM service with context
            self.llm_service = SimpleLLMService(cv_text, jd_text)
            
            # Send initial greeting
            await self.send_ai_greeting()
            
            self.is_active = True
            logger.info(f"Interview session initialized: interview_id={self.interview_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing session: {e}")
            await self.websocket.send_json({
                "type": "error",
                "message": f"Failed to initialize session: {str(e)}"
            })
            return False
    
    async def send_ai_greeting(self):
        """Send initial AI greeting"""
        try:
            # Get conversation history from DB
            conversation_history = []
            
            # Generate first question
            greeting = await self.llm_service.generate_question(conversation_history)
            
            # Send transcript first
            timestamp = datetime.now(timezone.utc).isoformat()
            await self.websocket.send_json({
                "type": "ai_transcript",
                "text": greeting,
                "timestamp": timestamp
            })
            
            # Save to transcript cache
            await transcript_service.add_message(
                self.interview_id,
                "ai",
                greeting,
                timestamp
            )
            
            # Save to database
            sequence_number = MessageRepository.get_next_sequence_number(self.db, self.interview_id)
            message_create = MessageCreate(
                interview_id=self.interview_id,
                sender="ai",
                content=greeting,
                sequence_number=sequence_number,
                audio_url=None
            )
            MessageRepository.create(self.db, message_create)
            
            # Generate and send audio
            audio_data = await tts_service.speak(greeting)
            if audio_data:
                await self.websocket.send_json({
                    "type": "ai_audio",
                    "data": audio_data.hex(),
                    "timestamp": timestamp
                })
            
            logger.info(f"Sent AI greeting for interview {self.interview_id}")
            
        except Exception as e:
            logger.error(f"Error sending AI greeting: {e}")
    
    async def process_user_audio(self, audio_data: bytes):
        """Process user audio and generate AI response"""
        try:
            # Transcribe user audio
            logger.info(f"Transcribing user audio: {len(audio_data)} bytes")
            user_text = await stt_service.transcribe(audio_data)
            
            if not user_text or len(user_text.strip()) == 0:
                logger.warning("Empty transcription, skipping")
                return
            
            logger.info(f"User transcription: {user_text}")
            
            # Send user transcript
            user_timestamp = datetime.now(timezone.utc).isoformat()
            await self.websocket.send_json({
                "type": "user_transcript",
                "text": user_text,
                "timestamp": user_timestamp
            })
            
            # Save user message to cache
            await transcript_service.add_message(
                self.interview_id,
                "user",
                user_text,
                user_timestamp
            )
            
            # Save user message to database
            user_sequence = MessageRepository.get_next_sequence_number(self.db, self.interview_id)
            user_message = MessageCreate(
                interview_id=self.interview_id,
                sender="user",
                content=user_text,
                sequence_number=user_sequence,
                audio_url=None
            )
            MessageRepository.create(self.db, user_message)
            
            # Get conversation history
            messages = MessageRepository.get_interview_messages(self.db, self.interview_id)
            conversation_history = [
                {"sender": msg.sender, "content": msg.content}
                for msg in messages
            ]
            
            # Generate AI response
            logger.info("Generating AI response...")
            ai_text = await self.llm_service.generate_question(conversation_history)
            
            # Send AI transcript
            ai_timestamp = datetime.now(timezone.utc).isoformat()
            await self.websocket.send_json({
                "type": "ai_transcript",
                "text": ai_text,
                "timestamp": ai_timestamp
            })
            
            # Save AI message to cache
            await transcript_service.add_message(
                self.interview_id,
                "ai",
                ai_text,
                ai_timestamp
            )
            
            # Save AI message to database
            ai_sequence = MessageRepository.get_next_sequence_number(self.db, self.interview_id)
            ai_message = MessageCreate(
                interview_id=self.interview_id,
                sender="ai",
                content=ai_text,
                sequence_number=ai_sequence,
                audio_url=None
            )
            MessageRepository.create(self.db, ai_message)
            
            # Generate AI audio
            logger.info("Generating AI audio...")
            audio_response = await tts_service.speak(ai_text)
            
            if audio_response and len(audio_response) > 0:
                await self.websocket.send_json({
                    "type": "ai_audio",
                    "data": audio_response.hex(),
                    "timestamp": ai_timestamp
                })
                logger.info(f"Sent AI audio response: {len(audio_response)} bytes")
            
        except Exception as e:
            logger.error(f"Error processing user audio: {e}")
            await self.websocket.send_json({
                "type": "error",
                "message": f"Error processing audio: {str(e)}"
            })


@router.websocket("/ws/interview")
async def websocket_interview_endpoint(
    websocket: WebSocket,
    interview_id: int = Query(..., description="Interview session ID"),
    token: str = Query(..., description="JWT authentication token")
):
    """
    WebSocket endpoint for real-time interview sessions.
    
    Query Parameters:
        - interview_id: The ID of the interview session
        - token: JWT authentication token
    
    Message Format (Client → Server):
        - Binary: Audio data bytes (WebM format from MediaRecorder)
        - JSON: { "type": "ping" } for connection keep-alive
    
    Message Format (Server → Client):
        - { "type": "connected", "message": "..." }
        - { "type": "user_transcript", "text": "...", "timestamp": "..." }
        - { "type": "ai_transcript", "text": "...", "timestamp": "..." }
        - { "type": "ai_audio", "data": "hex_encoded_wav", "timestamp": "..." }
        - { "type": "error", "message": "..." }
    """
    await websocket.accept()
    logger.info(f"WebSocket connection accepted: interview_id={interview_id}")
    
    # Check if services are initialized
    if not stt_service or not tts_service:
        await websocket.send_json({
            "type": "error",
            "message": "Speech services not initialized"
        })
        await websocket.close()
        return
    
    db: Optional[Session] = None
    session: Optional[InterviewSession] = None
    
    try:
        # Validate JWT token
        token_data = decode_token(token)
        if not token_data:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid or expired token"
            })
            await websocket.close()
            return
        
        # Create database session
        db = SessionLocal()
        
        # Create interview session
        session = InterviewSession(
            websocket=websocket,
            interview_id=interview_id,
            user_id=token_data.user_id,
            db=db
        )
        
        # Initialize session (loads context, sends greeting)
        if not await session.initialize():
            await websocket.close()
            return
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Interview session started",
            "interview_id": interview_id
        })
        
        # Main message loop
        while session.is_active:
            try:
                # Receive message (can be binary audio or JSON)
                message = await websocket.receive()
                
                if "bytes" in message:
                    # Audio data received
                    audio_data = message["bytes"]
                    logger.info(f"Received audio: {len(audio_data)} bytes")
                    await session.process_user_audio(audio_data)
                
                elif "text" in message:
                    # JSON message received
                    import json
                    data = json.loads(message["text"])
                    
                    if data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                    
                    elif data.get("type") == "end_interview":
                        logger.info(f"Interview {interview_id} ended by user")
                        session.is_active = False
                        await websocket.send_json({
                            "type": "interview_ended",
                            "message": "Interview session ended"
                        })
                
            except WebSocketDisconnect:
                logger.info(f"Client disconnected: interview_id={interview_id}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Session error: {str(e)}"
            })
        except:
            pass
    
    finally:
        # Cleanup
        if db:
            db.close()
        
        try:
            await websocket.close()
        except:
            pass
        
        logger.info(f"WebSocket connection closed: interview_id={interview_id}")


# Need to import models here to avoid circular imports
from app.db import models


# ─────────────────────────────────────────────────────────────────────────────
# Chat-based (text-only) interview WebSocket
# ─────────────────────────────────────────────────────────────────────────────

class ChatInterviewSession:
    """Manages a text-only interview WebSocket session (no STT / TTS)."""

    def __init__(
        self,
        websocket: WebSocket,
        interview_id: int,
        user_id: int,
        db: Session,
    ):
        self.websocket = websocket
        self.interview_id = interview_id
        self.user_id = user_id
        self.db = db
        self.llm_service: Optional[SimpleLLMService] = None
        self.is_active = False

    async def initialize(self) -> bool:
        """Load interview context and send the opening question."""
        try:
            interview = InterviewRepository.get(self.db, self.interview_id)
            if not interview:
                await self.websocket.send_json({"type": "error", "message": "Interview not found"})
                return False

            if interview.user_id != self.user_id:
                await self.websocket.send_json({"type": "error", "message": "Not authorized for this interview"})
                return False

            if interview.status != "in_progress":
                await self.websocket.send_json({
                    "type": "error",
                    "message": f"Interview is {interview.status}, not in progress",
                })
                return False

            # Load CV text
            user = self.db.query(models.User).filter(models.User.id == self.user_id).first()
            cv_text = (user.profile.cv_parsed_text if user and user.profile else None) or "No CV uploaded"
            jd_text = interview.job_description or "No job description provided"

            # Cache context & init LLM
            if transcript_service:
                await transcript_service.cache_interview_context(self.interview_id, cv_text, jd_text)
            self.llm_service = SimpleLLMService(cv_text, jd_text)

            # Send opening greeting as text
            await self._send_ai_greeting()
            self.is_active = True
            logger.info(f"Chat interview session initialized: interview_id={self.interview_id}")
            return True

        except Exception as e:
            logger.error(f"Error initializing chat session: {e}")
            await self.websocket.send_json({"type": "error", "message": f"Failed to initialize session: {str(e)}"})
            return False

    async def _send_ai_greeting(self):
        """Generate and send the first AI question."""
        try:
            greeting = await self.llm_service.generate_question([])
            timestamp = datetime.now(timezone.utc).isoformat()

            await self.websocket.send_json({"type": "ai_message", "text": greeting, "timestamp": timestamp})

            if transcript_service:
                await transcript_service.add_message(self.interview_id, "ai", greeting, timestamp)

            seq = MessageRepository.get_next_sequence_number(self.db, self.interview_id)
            MessageRepository.create(self.db, MessageCreate(
                interview_id=self.interview_id,
                sender="ai",
                content=greeting,
                sequence_number=seq,
                audio_url=None,
            ))
            logger.info(f"Sent chat AI greeting for interview {self.interview_id}")
        except Exception as e:
            logger.error(f"Error sending chat AI greeting: {e}")

    async def process_user_text(self, user_text: str):
        """Handle an incoming text message from the user and reply with the next AI question."""
        try:
            user_text = user_text.strip()
            if not user_text:
                return

            user_timestamp = datetime.now(timezone.utc).isoformat()

            # Persist user message
            if transcript_service:
                await transcript_service.add_message(self.interview_id, "user", user_text, user_timestamp)
            user_seq = MessageRepository.get_next_sequence_number(self.db, self.interview_id)
            MessageRepository.create(self.db, MessageCreate(
                interview_id=self.interview_id,
                sender="user",
                content=user_text,
                sequence_number=user_seq,
                audio_url=None,
            ))

            # Build conversation history and generate AI reply
            messages = MessageRepository.get_interview_messages(self.db, self.interview_id)
            conversation_history = [{"sender": m.sender, "content": m.content} for m in messages]
            ai_text = await self.llm_service.generate_question(conversation_history)

            ai_timestamp = datetime.now(timezone.utc).isoformat()

            # Persist AI message
            if transcript_service:
                await transcript_service.add_message(self.interview_id, "ai", ai_text, ai_timestamp)
            ai_seq = MessageRepository.get_next_sequence_number(self.db, self.interview_id)
            MessageRepository.create(self.db, MessageCreate(
                interview_id=self.interview_id,
                sender="ai",
                content=ai_text,
                sequence_number=ai_seq,
                audio_url=None,
            ))

            await self.websocket.send_json({"type": "ai_message", "text": ai_text, "timestamp": ai_timestamp})

        except Exception as e:
            logger.error(f"Error processing user text: {e}")
            await self.websocket.send_json({"type": "error", "message": f"Error processing message: {str(e)}"})


@router.websocket("/ws/chat-interview")
async def websocket_chat_interview_endpoint(
    websocket: WebSocket,
    interview_id: int = Query(..., description="Interview session ID"),
    token: str = Query(..., description="JWT authentication token"),
):
    """
    WebSocket endpoint for text-only (chat) interview sessions.

    Client → Server JSON:
        { "type": "user_message", "text": "..." }
        { "type": "ping" }
        { "type": "end_interview" }

    Server → Client JSON:
        { "type": "connected", "interview_id": N }
        { "type": "ai_message", "text": "...", "timestamp": "..." }
        { "type": "interview_ended" }
        { "type": "error", "message": "..." }
        { "type": "pong" }
    """
    await websocket.accept()
    logger.info(f"Chat WebSocket accepted: interview_id={interview_id}")

    db: Optional[Session] = None
    session: Optional[ChatInterviewSession] = None

    try:
        token_data = decode_token(token)
        if not token_data:
            await websocket.send_json({"type": "error", "message": "Invalid or expired token"})
            await websocket.close()
            return

        db = SessionLocal()
        session = ChatInterviewSession(
            websocket=websocket,
            interview_id=interview_id,
            user_id=token_data.user_id,
            db=db,
        )

        if not await session.initialize():
            await websocket.close()
            return

        await websocket.send_json({"type": "connected", "interview_id": interview_id})

        import json as _json

        while session.is_active:
            try:
                message = await websocket.receive()

                if "text" in message:
                    data = _json.loads(message["text"])
                    msg_type = data.get("type")

                    if msg_type == "user_message":
                        await session.process_user_text(data.get("text", ""))

                    elif msg_type == "ping":
                        await websocket.send_json({"type": "pong"})

                    elif msg_type == "end_interview":
                        logger.info(f"Chat interview {interview_id} ended by user")
                        session.is_active = False
                        await websocket.send_json({"type": "interview_ended", "message": "Interview session ended"})

                elif "bytes" in message:
                    # Binary frames are not expected in chat mode — ignore gracefully
                    logger.warning("Received unexpected binary frame in chat interview session")

            except WebSocketDisconnect:
                logger.info(f"Chat client disconnected: interview_id={interview_id}")
                break

    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": f"Session error: {str(e)}"})
        except Exception:
            pass

    finally:
        if db:
            db.close()
        try:
            await websocket.close()
        except Exception:
            pass
        logger.info(f"Chat WebSocket closed: interview_id={interview_id}")
