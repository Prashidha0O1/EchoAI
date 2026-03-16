import pyttsx3
import tempfile
import os
from speech_pipeline.interface import TTSProvider

class Pyttsx3TTS(TTSProvider):
    def __init__(self):
        pass

    async def speak(self, text: str) -> bytes:
        fd, output_file = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
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
        finally:
            if os.path.exists(output_file):
                try:
                    os.unlink(output_file)
                except:
                    pass
