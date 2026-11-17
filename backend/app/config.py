import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env file."""

    app_name: str = "SalesPilot AI"
    app_version: str = "1.0.0"
    database_url: str = "sqlite:///./salespilot.db"
    max_upload_size_mb: int = 25

    ai_provider: str = "deterministic"  # deterministic | openai | gemini
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
