from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    environment: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    mongodb_uri: str = "mongodb://127.0.0.1:27017/myworkspace"
    mongodb_db_name: str = "myworkspace"
    redis_url: str = "redis://127.0.0.1:6379"
    openrouter_api_key: str = ""
    openrouter_model: str = "qwen/qwen3-coder:free"
    crewai_model: str = "openrouter/qwen/qwen3-coder:free"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:4000"]

    model_config = {"env_file": os.path.join(os.path.dirname(__file__), "..", "..", ".env"), "env_file_encoding": "utf-8"}


settings = Settings()
