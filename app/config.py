from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    POSTGRES_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240
    ALLOWED_ORIGINS: str = "http://localhost:8000"  # Change this to str
    OPENAI_API_KEY: str
    DEEPGRAM_API_KEY: str
    ELEVEN_API_KEY: str
    ELEVEN_VOICE_ID: str
    CHROMA_DB_URL: str
    CHROMA_COLLECTION_ID: str
    CHROMA_API_KEY: str
    MATH_CHATBOT_URL: str
    MULTIMODAL_URL: str

    class Config:
        env_file = "/etc/secrets/.env"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

settings = Settings()
