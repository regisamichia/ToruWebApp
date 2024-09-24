from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./users.db"
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240
    ALLOWED_ORIGINS: str = "http://localhost:8000"  # Change this to str
    OPENAI_API_KEY: str
    DEEPGRAM_API_KEY: str
    ELEVEN_API_KEY: str
    ELEVEN_VOICE_ID: str

    class Config:
        env_file = ".env"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

settings = Settings()