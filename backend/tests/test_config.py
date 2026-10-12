"""Pytest suite for application configuration validation."""

from backend.app.core.config import Settings


def test_default_settings():
    settings = Settings()
    assert settings.PROJECT_NAME == "EDXSO AI Influencer Outreach System"
    assert settings.SIMULATION_MODE is True
    assert settings.ALLOW_LIVE_EMAIL_SENDING is False
    assert settings.MONGODB_DB_NAME == "edxso_influencer_outreach"
    assert settings.MONGODB_TIMEOUT_MS == 3000


def test_cors_origins_parsing():
    settings_json = Settings(CORS_ORIGINS='["http://localhost:3000", "http://localhost:5173"]')
    assert "http://localhost:3000" in settings_json.CORS_ORIGINS
    assert "http://localhost:5173" in settings_json.CORS_ORIGINS

    settings_comma = Settings(CORS_ORIGINS="http://example.com, http://app.com")
    assert "http://example.com" in settings_comma.CORS_ORIGINS
    assert "http://app.com" in settings_comma.CORS_ORIGINS


def test_safety_guardrails_prevent_accidental_live_sending():
    settings = Settings()
    # Confirm live email sending is strictly gated
    assert not settings.ALLOW_LIVE_EMAIL_SENDING
    assert settings.SIMULATION_MODE
