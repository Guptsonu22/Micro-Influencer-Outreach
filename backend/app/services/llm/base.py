"""Base interface for LLM providers."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers (Gemini, Mock, etc.)."""

    provider_name: str = "base"
    model_name: str = "default"
    is_mock: bool = False

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """Generates raw text response given prompt and system instructions."""
        pass
