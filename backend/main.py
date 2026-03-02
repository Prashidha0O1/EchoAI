from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from speech_pipeline.stt.whisper_stt import WhisperSTT
from speech_pipeline.tts.pyttsx3_tts import Pyttsx3TTS
from speech_pipeline.webrtc import offer
from database import models
from database.database import engine
from routers import auth_router, interviews_router, profile_router, verification_router, resumes_router
from app.api.v1.interviews.websocket import router as websocket_router
from sqlalchemy import text
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
        conn.commit()
    logger.info("DB migrations applied successfully.")

try:
    run_migrations()
except Exception as e:
    logger.error(f"Migration error (non-fatal): {e}")

# Create any brand-new tables (e.g. resumes) defined in models
models.Base.metadata.create_all(bind=engine)

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
app.include_router(websocket_router)

# Initialize models
logger.info("Initializing models...")
try:
    stt_service = WhisperSTT()
    tts_service = Pyttsx3TTS()
    logger.info("Models initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing models: {e}")
    stt_service = None
    tts_service = None

@app.get("/")
def read_root():
    """Root endpoint - Welcome message"""
    return {"message": "Welcome to EchoAI Backend"}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "stt_service": "initialized" if stt_service else "failed",
        "tts_service": "initialized" if tts_service else "failed"
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
