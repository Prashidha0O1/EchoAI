"""Application configuration and environment variables"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings from environment variables"""
    
    # Application
    APP_NAME: str = "EchoAI Interview Agent"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    
    # Rate Limiting
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_SECONDS: int = 300  # 5 minutes
    PASSWORD_RESET_TOKEN_EXPIRE: int = 3600  # 1 hour
    
    # File Upload
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    MAX_CV_SIZE: int = 5 * 1024 * 1024  # 5MB
    MAX_PROFILE_PIC_SIZE: int = 2 * 1024 * 1024  # 2MB
    ALLOWED_CV_EXTENSIONS: set = {".pdf", ".docx", ".doc", ".txt"}
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    
    # CORS
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
    
    # Speech Models
    STT_MODEL: str = os.getenv("STT_MODEL", "base")  # Whisper model size
    TTS_ENGINE: str = os.getenv("TTS_ENGINE", "pyttsx3")
    
    @property
    def cv_upload_dir(self) -> str:
        path = os.path.join(self.UPLOAD_DIR, "cvs")
        os.makedirs(path, exist_ok=True)
        return path
    
    @property
    def profile_picture_dir(self) -> str:
        path = os.path.join(self.UPLOAD_DIR, "profile_pictures")
        os.makedirs(path, exist_ok=True)
        return path


settings = Settings()
