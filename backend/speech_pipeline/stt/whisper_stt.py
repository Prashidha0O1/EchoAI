import asyncio
import whisper
import numpy as np
import io
import tempfile
import os
from speech_pipeline.interface import STTProvider

class WhisperSTT(STTProvider):
    def __init__(self, model_size: str = "base"):
        print(f"Loading Whisper model: {model_size}...")
        self.model = whisper.load_model(model_size)
        print("Whisper model loaded.")

    def _transcribe_sync(self, audio_data: bytes) -> str:
        """Synchronous transcription — called via asyncio.to_thread() to avoid blocking the event loop."""
        if len(audio_data) < 100:
            print(f"Audio data too small: {len(audio_data)} bytes")
            return ""

        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_audio:
            temp_audio.write(audio_data)
            temp_audio_path = temp_audio.name

        try:
            print(f"Transcribing audio file: {temp_audio_path} ({len(audio_data)} bytes)")
            result = self.model.transcribe(
                temp_audio_path,
                fp16=False,
                language='en',
                initial_prompt="This is a conversation in English."
            )
            transcribed_text = result['text'].strip()
            print(f"Transcription result: {transcribed_text}")
            return transcribed_text
        finally:
            if os.path.exists(temp_audio_path):
                try:
                    os.unlink(temp_audio_path)
                except:
                    pass

    async def transcribe(self, audio_data: bytes) -> str:
        try:
            return await asyncio.to_thread(self._transcribe_sync, audio_data)
        except Exception as e:
            print(f"Error in transcription: {e}")
            return ""
