import whisper
import numpy as np
import io
import soundfile as sf
from speech_pipeline.interface import STTProvider

class WhisperSTT(STTProvider):
    def __init__(self, model_size: str = "base"):
        print(f"Loading Whisper model: {model_size}...")
        self.model = whisper.load_model(model_size)
        print("Whisper model loaded.")

    async def transcribe(self, audio_data: bytes) -> str:
        try:
            audio_file = io.BytesIO(audio_data)
            data, samplerate = sf.read(audio_file)
            
            if data.dtype != np.float32:
                data = data.astype(np.float32)
            
            if len(data.shape) > 1:
                data = data.mean(axis=1)

            result = self.model.transcribe(data, fp16=False)
            return result['text']
        except Exception as e:
            print(f"Error in transcription: {e}")
            return ""
