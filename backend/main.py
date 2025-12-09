from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from speech_pipeline.stt.whisper_stt import WhisperSTT
from speech_pipeline.tts.pyttsx3_tts import Pyttsx3TTS
from speech_pipeline.webrtc import offer

app = FastAPI(title="EchoAI Interview Agent", version="0.1.0")

# Initialize models
print("Initializing models...")
stt_service = WhisperSTT()
tts_service = Pyttsx3TTS()
print("Models initialized.")

@app.get("/")
def read_root():
    return {"message": "Welcome to EchoAI Backend"}

@app.post("/offer")
async def webrtc_offer(request: Request):
    params = await request.json()
    return await offer(params)

@app.websocket("/ws/interview")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
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
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()
