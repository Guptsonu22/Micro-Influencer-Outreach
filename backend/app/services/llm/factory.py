"""Factory for obtaining configured LLM providers."""

import logging
from typing import Optional
from backend.app.core.config import settings
from backend.app.services.llm.base import BaseLLMProvider
from backend.app.services.llm.gemini_provider import GeminiProvider
from backend.app.services.llm.mock_provider import MockLLMProvider

logger = logging.getLogger("edxso.service.llm.factory")


def get_llm_provider(force_mock: bool = False) -> BaseLLMProvider:
    """Returns the configured LLM provider.

    Uses GeminiProvider if GEMINI_API_KEY is present and force_mock is False.
    Otherwise falls back to MockLLMProvider clearly marked with is_mock=True.
    """
    if force_mock:
        return MockLLMProvider()

    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model_name=settings.GEMINI_MODEL)

    logger.warning("No live GEMINI_API_KEY detected. Defaulting to MockLLMProvider (is_mock=True).")
    return MockLLMProvider()
