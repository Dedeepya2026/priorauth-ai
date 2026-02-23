from pydantic_settings import BaseSettings
import os
import platform

class Settings(BaseSettings):
    APP_NAME: str = "PriorAuth AI"
    # Use /tmp on Linux (App Runner) for writable SQLite; local dev uses relative path
    DATABASE_URL: str = "sqlite:////tmp/priorauth.db" if platform.system() == "Linux" else "sqlite:///./priorauth.db"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "uploads")
    JWT_SECRET: str = "priorauth-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
