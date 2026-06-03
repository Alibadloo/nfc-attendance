from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "NFC Attendance System"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    DATABASE_URL: str = "postgresql://nfc_user:nfc_pass@db:5432/nfc_attendance"

    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB

    # Anti-duplicate: prevent same NFC scan within this many minutes
    DUPLICATE_SCAN_WINDOW_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
