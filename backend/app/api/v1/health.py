"""Health and system readiness endpoint."""

from typing import Any, Dict
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.core.database import db_manager

router = APIRouter(prefix="/health", tags=["Health & System"])


@router.get("", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """Returns detailed status of the system, credentials, database, and safety controls."""
    db_healthy = await db_manager.is_healthy()
    total_creators = await db_manager.count_creators()
    real_creators = await db_manager.count_creators(is_synthetic=False)
    synthetic_creators = await db_manager.count_creators(is_synthetic=True)

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": "connected" if db_healthy else "in_memory_mode",
            "is_persistent_mongodb": not db_manager.use_in_memory,
            "total_records": total_creators,
            "real_records": real_creators,
            "synthetic_records": synthetic_creators
        },
        "integrations": {
            "youtube_api_configured": bool(settings.YOUTUBE_API_KEY and settings.YOUTUBE_API_KEY != ""),
            "gemini_api_configured": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() != ""),
            "active_llm_provider": "gemini" if bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip()) else "mock",
            "is_mock_llm": not bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip()),
            "gemini_model": settings.GEMINI_MODEL
        },
        "safety_guardrails": {
            "simulation_mode": settings.SIMULATION_MODE,
            "allow_live_email_sending": settings.ALLOW_LIVE_EMAIL_SENDING,
            "instagram_dm_automated_sending": False,  # Strict platform rule: DMs are copy drafts only
            "duplicate_prevention_enabled": True
        }
    }
