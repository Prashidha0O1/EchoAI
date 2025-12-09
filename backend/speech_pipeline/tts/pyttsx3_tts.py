import pyttsx3
import io
from speech_pipeline.interface import TTSProvider

class Pyttsx3TTS(TTSProvider):
    def __init__(self):
        pass

    async def speak(self, text: str) -> bytes:
        output_file = "temp_tts.wav"
        try:
            engine = pyttsx3.init()
            engine.save_to_file(text, output_file)
            engine.runAndWait()
            
            with open(output_file, "rb") as f:
                audio_data = f.read()
            return audio_data
        except Exception as e:
            print(f"Error in TTS: {e}")
            return b""
