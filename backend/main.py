from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from speech_pipeline.stt.whisper_stt import WhisperSTT
from speech_pipeline.tts.pyttsx3_tts import Pyttsx3TTS
from speech_pipeline.webrtc import offer
from database import models, schemas, crud, auth
from database.database import engine, get_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EchoAI Interview Agent",
    version="0.1.0",
    description="AI-powered interview practice assistant with speech-to-text and text-to-speech capabilities"
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            "WebSocket /ws/interview": "Interview WebSocket connection"
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

@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.websocket("/ws/interview")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")
    
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
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()
