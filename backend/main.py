from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from speech_pipeline.webrtc import offer
from database import models
from database.database import engine
from routers import auth_router, interviews_router, profile_router, verification_router, resumes_router, ats_router, question_generator_router, admin_router, leaderboard_router
from app.api.v1.interviews.websocket import router as websocket_router
from sqlalchemy import text
import asyncio
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EchoAI Interview Agent",
    version="0.1.0",
    description="AI-powered interview practice assistant with speech-to-text and text-to-speech capabilities"
)

# ── Auto-migration: add any missing columns / tables ──────────────────────────
def run_migrations():
    """
    Safely add columns/tables that were introduced after the initial DB creation.
    Uses IF NOT EXISTS so it is safe to run on every startup.
    """
    with engine.connect() as conn:
        # --- users table: email-verification columns ---
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
            "email_verified BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
            "verification_code VARCHAR(6)"
        ))
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
            "verification_code_created_at TIMESTAMPTZ"
        ))
        # --- interviews table: role and experience_level columns ---
        conn.execute(text(
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS "
            "role VARCHAR(200)"
        ))
        conn.execute(text(
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS "
            "experience_level VARCHAR(50)"
        ))
        conn.commit()
    logger.info("DB migrations applied successfully.")

try:
    run_migrations()
except Exception as e:
    logger.error(f"Migration error (non-fatal): {e}")

# Create any brand-new tables (e.g. resumes) defined in models
models.Base.metadata.create_all(bind=engine)


def seed_admin_user():
    """Create the hardcoded admin account if it does not already exist."""
    from database.database import SessionLocal
    from database import crud, auth as db_auth
    db = SessionLocal()
    try:
        existing = crud.get_user_by_email(db, "admin@echo.ai")
        if not existing:
            admin = models.User(
                username="admin",
                email="admin@echo.ai",
                hashed_password=db_auth.get_password_hash("nimda@123"),
                first_name="EchoAI",
                last_name="Admin",
                is_admin=True,
                is_active=True,
                email_verified=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            profile = models.UserProfile(user_id=admin.id)
            db.add(profile)
            db.commit()
            logger.info("Admin user created: admin@echo.ai")
        else:
            # Idempotent: ensure flags are correct even if account pre-existed
            if not existing.is_admin or not existing.email_verified:
                existing.is_admin = True
                existing.email_verified = True
                db.commit()
                logger.info("Admin user flags repaired.")
    except Exception as e:
        logger.error(f"Admin seed error (non-fatal): {e}")
    finally:
        db.close()


try:
    seed_admin_user()
except Exception as e:
    logger.error(f"Admin seed failed (non-fatal): {e}")


# Create uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(interviews_router)
app.include_router(profile_router)
app.include_router(verification_router)
app.include_router(resumes_router)
app.include_router(ats_router)
app.include_router(question_generator_router)
app.include_router(websocket_router)
app.include_router(admin_router)
app.include_router(leaderboard_router)

# Global exception handler — prevents unhandled errors from crashing the ASGI process
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Global references — populated asynchronously at startup
stt_service = None
tts_service = None


@app.on_event("startup")
async def load_models():
    """Fire-and-forget ML model loading so the server accepts requests immediately."""
    global stt_service, tts_service

    async def _load_stt_tts():
        global stt_service, tts_service
        try:
            from speech_pipeline.stt.whisper_stt import WhisperSTT
            from speech_pipeline.tts.pyttsx3_tts import Pyttsx3TTS
            stt_service = await asyncio.to_thread(WhisperSTT)
            tts_service = Pyttsx3TTS()
            logger.info("STT/TTS models initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing STT/TTS models: {e}")

    async def _load_ats():
        try:
            from app.services.ats_service import get_ats_service
            _ats = await asyncio.to_thread(get_ats_service)
            if _ats.is_loaded:
                logger.info("ATS model pre-loaded successfully.")
            else:
                logger.warning("ATS model failed to load; /ats/check will return 503 until fixed.")
        except Exception as e:
            logger.error(f"Error pre-loading ATS model: {e}")

    async def _load_qgen():
        try:
            from app.services.question_generator_service import get_question_generator
            _qgen = await asyncio.to_thread(get_question_generator)
            if _qgen.is_loaded:
                logger.info("Gemma 3 question-generator model pre-loaded successfully.")
            else:
                logger.warning("Gemma 3 model failed to load; /generate-questions will use fallback template questions.")
        except Exception as e:
            logger.error(f"Error pre-loading Gemma 3 model: {e}")

    async def _load_all():
        await asyncio.gather(_load_stt_tts(), _load_ats(), _load_qgen())

    logger.info("Loading ML models in background (server is accepting requests)...")
    asyncio.create_task(_load_all())

@app.get("/")
def read_root():
    """Root endpoint - Welcome message"""
    return {"message": "Welcome to EchoAI Backend"}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "stt_service": "initialized" if stt_service else "loading",
        "tts_service": "initialized" if tts_service else "loading",
    }

@app.get("/info")
def get_info():
    """Get information about available endpoints and service status"""
    return {
        "service": "EchoAI Interview Agent",
        "version": "0.1.0",
        "endpoints": {
            "GET /": "Welcome message",
            "GET /health": "Health check",
            "GET /info": "Service information",
            "POST /offer": "WebRTC offer",
            "WebSocket /ws/interview": "Interview WebSocket connection",
            "Auth": "/auth/register, /auth/login, /auth/me, /auth/forgot-password, /auth/reset-password",
            "Interviews": "/interviews (CRUD), /interviews/{id}/start, /interviews/{id}/end, /interviews/{id}/messages",
            "Profile": "/profile, /profile/cv, /profile/picture"
        },
        "models": {
            "stt": "Whisper (base)" if stt_service else "Not loaded",
            "tts": "Pyttsx3" if tts_service else "Not loaded"
        },
        "docs": "/docs",
        "status": "running"
    }

@app.post("/offer")
async def webrtc_offer(request: Request):
    """WebRTC offer endpoint"""
    params = await request.json()
    return await offer(params)

@app.get("/test-webrtc")
async def serve_test_webrtc():
    """Serve the WebRTC test page"""
    try:
        with open("test_webrtc.html", "r") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except FileNotFoundError:
        return {"error": "test_webrtc.html not found"}

@app.get("/test-websocket")
async def serve_test_websocket():
    """Serve the WebSocket test page"""
    try:
        with open("test_client.html", "r") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except FileNotFoundError:
        return {"error": "test_client.html not found"}

# Legacy WebSocket endpoint - now handled by websocket_router
# Kept for backward compatibility with old test clients
@app.websocket("/ws/interview/test")
async def websocket_test_endpoint(websocket: WebSocket):
    """Legacy test endpoint for simple audio echo"""
    await websocket.accept()
    logger.info("WebSocket test client connected")
    
    if not stt_service or not tts_service:
        await websocket.send_json({"error": "Services not initialized"})
        await websocket.close()
        return
    
    try:
        while True:
            data = await websocket.receive_bytes()
            
            text = await stt_service.transcribe(data)
            print(f"User said: {text}")
            
            if text.strip():
                await websocket.send_json({"type": "transcription", "text": text})
                
                response_text = f"I heard you say: {text}. Tell me more."
                
                audio_response = await tts_service.speak(response_text)
                await websocket.send_bytes(audio_response)
                
    except WebSocketDisconnect:
        logger.info("WebSocket test client disconnected")
    except Exception as e:
        logger.error(f"WebSocket test error: {e}")
        await websocket.close()
