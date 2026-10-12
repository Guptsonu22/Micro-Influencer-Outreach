"""Centralized application configuration loaded from environment variables."""

import json
import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with strict validation and server-side secret isolation."""

    # Project Information
    PROJECT_NAME: str = Field(
        default="EDXSO AI Influencer Outreach System",
        description="Public project name"
    )
    ENVIRONMENT: str = Field(
        default="development",
        description="Deployment environment ('development', 'staging', 'production')"
    )
    DEBUG: bool = Field(
        default=True,
        description="Debug mode toggle"
    )
    API_V1_STR: str = Field(
        default="/api/v1",
        description="API version 1 prefix"
    )

    # MongoDB Settings
    MONGODB_URI: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection string"
    )
    MONGODB_DB_NAME: str = Field(
        default="edxso_influencer_outreach",
        description="Database name for influencer data"
    )
    MONGODB_TIMEOUT_MS: int = Field(
        default=3000,
        description="Server selection timeout in milliseconds"
    )

    # YouTube Data API v3 (Server-side only)
    YOUTUBE_API_KEY: str = Field(
        default="",
        description="Google Cloud API key for YouTube Data API v3"
    )
    YOUTUBE_MAX_SEARCH_RESULTS: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Max results per search page"
    )

    # Google Gemini API (Server-side only)
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google AI Studio API key"
    )
    GEMINI_MODEL: str = Field(
        default="gemini-2.5-flash",
        description="Default Gemini model identifier"
    )

    # Safety Guardrails & Outreach Policies
    SIMULATION_MODE: bool = Field(
        default=True,
        description="When True, emails and DMs are simulated only and never sent to external servers"
    )
    ALLOW_LIVE_EMAIL_SENDING: bool = Field(
        default=False,
        description="Strict safety gate: must be explicitly True to enable live email delivery"
    )

    # Optional SMTP Relay Settings
    SMTP_HOST: str = Field(default="")
    SMTP_PORT: int = Field(default=587)
    SMTP_USERNAME: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_FROM_EMAIL: str = Field(default="")
    SMTP_FROM_NAME: str = Field(default="EDXSO Partnerships")

    # CORS Allowed Origins
    CORS_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
