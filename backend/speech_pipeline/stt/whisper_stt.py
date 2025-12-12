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

    async def transcribe(self, audio_data: bytes) -> str:
        """
        Transcribe audio data to text.
        The audio_data can be in various formats (WebM, WAV, etc.)
        Whisper uses ffmpeg internally to handle format conversion.
        """
        try:
            # Check if we have valid audio data
            if len(audio_data) < 100:
                print(f"Audio data too small: {len(audio_data)} bytes")
                return ""
            
            # Save audio bytes to a temporary file
            # Try with .opus extension first (WebM usually contains Opus audio)
            with tempfile.NamedTemporaryFile(delete=False, suffix='.opus') as temp_audio:
                temp_audio.write(audio_data)
                temp_audio_path = temp_audio.name
            
            try:
                # Whisper will handle the audio format conversion internally via ffmpeg
                print(f"Transcribing audio file: {temp_audio_path} ({len(audio_data)} bytes)")
                result = self.model.transcribe(
                    temp_audio_path, 
                    fp16=False,
                    language='en',  # Specify English for better accuracy
                    initial_prompt="This is a conversation in English."
                )
                transcribed_text = result['text'].strip()
                print(f"Transcription result: {transcribed_text}")
                return transcribed_text
            finally:
                # Clean up the temporary file
                if os.path.exists(temp_audio_path):
                    try:
                        os.unlink(temp_audio_path)
                    except:
                        pass
                    
        except Exception as e:
            print(f"Error in transcription: {e}")
            return ""
