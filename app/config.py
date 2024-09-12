from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./users.db"
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240
    ALLOWED_ORIGINS: list = ["*"]
    OPENAI_API_KEY: str
    DEEPGRAM_API_KEY : str

    class Config:
        env_file = ".env"

settings = Settings()
