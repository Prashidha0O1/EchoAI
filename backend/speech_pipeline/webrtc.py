import asyncio
import logging
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaPlayer, MediaRecorder
import numpy as np
import av
from speech_pipeline.stt.whisper_stt import WhisperSTT
from speech_pipeline.tts.pyttsx3_tts import Pyttsx3TTS

logger = logging.getLogger(__name__)

class InterviewStreamTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self, track, stt_service: WhisperSTT, tts_service: Pyttsx3TTS):
        super().__init__()
        self.track = track
        self.stt_service = stt_service
        self.tts_service = tts_service
        self.audio_buffer = []
        self.loop = asyncio.get_event_loop()

    async def recv(self):
        frame = await self.track.recv()
        
        # Convert to numpy for STT
        # aiortc gives us PyAV frames.
        # We need to convert to 16kHz mono float32 for Whisper.
        
        # This is a simplified example. Real-time audio processing with Whisper 
        # usually requires buffering a certain amount of audio (e.g. 1-3 seconds)
        # or using a streaming-capable model/VAD.
        
        # For this MVP, we will just pass through the audio for now
        # and print a log to show it's working.
        # Implementing full real-time STT/TTS loop in a single track recv 
        # is complex because recv() must return a frame quickly.
        
        # Ideally:
        # 1. Push audio to a queue.
        # 2. Background task processes queue -> STT -> LLM -> TTS.
        # 3. TTS output is pushed to an output queue.
        # 4. recv() pulls from output queue.
        
        return frame

# Global peer connection set (for simple cleanup)
pcs = set()

async def offer(params):
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print("Connection state is %s" % pc.connectionState)
        if pc.connectionState == "failed":
            await pc.close()
            pcs.discard(pc)

    # Initialize services
    stt = WhisperSTT()
    tts = Pyttsx3TTS()

    @pc.on("track")
    def on_track(track):
        if track.kind == "audio":
            print("Audio track received")
            # Create a local track that processes the incoming audio
            # local_audio = InterviewStreamTrack(track, stt, tts)
            # pc.addTrack(local_audio)
            
            # For now, just record it to blackhole to drain the track
            recorder = MediaBlackhole()
            recorder.addTrack(track)
            asyncio.ensure_future(recorder.start())

    await pc.setRemoteDescription(offer)

    # Send empty audio back for now (or silence)
    # In a real app, we'd attach the InterviewStreamTrack here
    
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return {
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    }
