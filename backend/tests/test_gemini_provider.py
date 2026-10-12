"""Tests for GeminiProvider, LLM factory, and credential safety (Phase 11)."""

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from backend.app.core.exceptions import AppException
from backend.app.services.llm.gemini_provider import GeminiProvider, _mask_key
from backend.app.services.llm.mock_provider import MockLLMProvider
from backend.app.services.llm.factory import get_llm_provider
from backend.app.services.llm_service import PersonalizationService


def test_mask_key_safety():
    """Verify that _mask_key never exposes the full key and masks correctly."""
    assert _mask_key("") == "<not configured>"
    assert _mask_key("short") == "<not configured>"
    masked = _mask_key("AIzaSyD-abc12345xyz9876_secret")
    assert "AIza" in masked
    assert "cret" in masked
    assert "abc12345xyz9876" not in masked
    assert "len=" in masked


def test_gemini_provider_init_properties():
    """Verify GeminiProvider metadata properties."""
    provider = GeminiProvider(api_key="AIzaSyTestFakeKey12345678", model_name="gemini-1.5-flash")
    assert provider.provider_name == "gemini"
    assert provider.is_mock is False
    assert provider.model_name == "gemini-1.5-flash"


def test_factory_force_mock():
    """Verify factory returns MockLLMProvider when force_mock=True."""
    with patch("backend.app.services.llm.factory.settings") as mock_settings:
        mock_settings.GEMINI_API_KEY = "live-gemini-key"
        mock_settings.GEMINI_MODEL = "gemini-1.5-flash"
        provider = get_llm_provider(force_mock=True)
        assert isinstance(provider, MockLLMProvider)
        assert provider.is_mock is True
        assert provider.provider_name == "mock"


def test_factory_with_gemini_key():
    """Verify factory returns GeminiProvider when GEMINI_API_KEY is configured."""
    with patch("backend.app.services.llm.factory.settings") as mock_settings:
        mock_settings.GEMINI_API_KEY = "AIzaSyLiveRealKey123456"
        mock_settings.GEMINI_MODEL = "gemini-1.5-flash"
        provider = get_llm_provider(force_mock=False)
        assert isinstance(provider, GeminiProvider)
        assert provider.is_mock is False
        assert provider.provider_name == "gemini"


def test_factory_fallback_when_no_key():
    """Verify factory gracefully falls back to MockLLMProvider when no key is set."""
    with patch("backend.app.services.llm.factory.settings") as mock_settings:
        mock_settings.GEMINI_API_KEY = ""
        mock_settings.GEMINI_MODEL = "gemini-1.5-flash"
        provider = get_llm_provider(force_mock=False)
        assert isinstance(provider, MockLLMProvider)
        assert provider.is_mock is True


@pytest.mark.asyncio
async def test_gemini_missing_key_raises_app_exception():
    """Verify that calling generate_text with empty key raises AppException."""
    provider = GeminiProvider(api_key="")
    with pytest.raises(AppException) as exc_info:
        await provider.generate_text(prompt="Hello")
    assert exc_info.value.code == "MISSING_GEMINI_API_KEY"
    assert exc_info.value.status_code == 500


@pytest.mark.asyncio
async def test_gemini_successful_generation():
    """Verify successful response parsing from Gemini REST API."""
    provider = GeminiProvider(api_key="AIzaSyTestFakeKey12345678", model_name="gemini-1.5-flash")

    mock_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "email_subject": "EDXSO Collaboration",
                                "email_body": "This is a strictly generated email body test for testing.",
                                "instagram_dm": "Hey there! Love your channel.",
                                "personalization_evidence": {"creator_name_used": "Test"},
                                "warnings": []
                            })
                        }
                    ]
                }
            }
        ]
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_gemini_response

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result_text = await provider.generate_text(prompt="Generate email")
        assert "EDXSO Collaboration" in result_text


@pytest.mark.asyncio
async def test_gemini_rate_limit_429():
    """Verify 429 rate limit raises LLM_RATE_LIMIT with Retry-After details."""
    provider = GeminiProvider(api_key="AIzaSyTestFakeKey12345678")

    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.headers = {"Retry-After": "30"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(AppException) as exc_info:
            await provider.generate_text(prompt="Generate copy")
        assert exc_info.value.code == "LLM_RATE_LIMIT"
        assert exc_info.value.status_code == 429
        assert "30" in exc_info.value.message


@pytest.mark.asyncio
async def test_gemini_auth_error_403():
    """Verify 403 API key error raises LLM_AUTH_ERROR."""
    provider = GeminiProvider(api_key="AIzaSyInvalidKey")

    mock_response = MagicMock()
    mock_response.status_code = 403
    mock_response.json.return_value = {"error": {"message": "API key not valid. Please pass a valid API key."}}
    mock_response.text = "API key not valid"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(AppException) as exc_info:
            await provider.generate_text(prompt="Generate copy")
        assert exc_info.value.code == "LLM_AUTH_ERROR"
        assert exc_info.value.status_code == 502
