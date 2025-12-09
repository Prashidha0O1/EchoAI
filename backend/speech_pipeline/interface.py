from abc import ABC, abstractmethod

class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_data: bytes) -> str:
        """Transcribe audio data to text."""
        pass

class TTSProvider(ABC):
    @abstractmethod
    async def speak(self, text: str) -> bytes:
        """Convert text to audio data."""
        pass
