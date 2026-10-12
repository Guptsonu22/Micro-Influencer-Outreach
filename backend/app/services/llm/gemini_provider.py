"""Google Gemini API LLM provider implementation."""

import logging
from typing import Any, Dict, Optional
import httpx
from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.services.llm.base import BaseLLMProvider

logger = logging.getLogger("edxso.service.llm.gemini")


def _mask_key(key: str) -> str:
    """Returns a safe masked representation for logging — never logs the real key value."""
    if not key or len(key) < 8:
        return "<not configured>"
    return f"{key[:4]}...{key[-4:]} (len={len(key)})"

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(BaseLLMProvider):
    """Integrates Google Gemini 1.5 Flash via REST API with credential security."""

    provider_name: str = "gemini"
    is_mock: bool = False

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self.timeout = httpx.Timeout(connect=8.0, read=30.0, write=10.0, pool=35.0)
        # Confirm key presence at init time without logging the actual value
        logger.info(
            "GeminiProvider initialized. model=%s key=%s",
            self.model_name,
            _mask_key(self.api_key)
        )

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """Sends prompt to Gemini generateContent endpoint."""
        if not self.api_key:
            raise AppException(
                code="MISSING_GEMINI_API_KEY",
                message="GEMINI_API_KEY is not configured in environment variables.",
                status_code=500
            )

        url = f"{GEMINI_API_BASE}/{self.model_name}:generateContent"
        params = {"key": self.api_key}

        logger.info(
            "Gemini generateContent request: model=%s temperature=%.1f",
            self.model_name, temperature
        )
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json"
            }
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "role": "system",
                "parts": [{"text": system_instruction}]
            }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                res = await client.post(url, params=params, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise AppException(
                            code="LLM_NO_CANDIDATE",
                            message="Gemini returned no response candidates (possible safety filter trigger).",
                            status_code=502
                        )
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"]
                    return ""
                elif res.status_code == 429:
                    retry_after = res.headers.get("Retry-After", "unknown")
                    raise AppException(
                        code="LLM_RATE_LIMIT",
                        message=(
                            f"Gemini API rate limit reached. "
                            f"Retry-After: {retry_after}s. Please wait before retrying."
                        ),
                        status_code=429
                    )
                elif res.status_code in [400, 401, 403]:
                    err_msg = res.json().get("error", {}).get("message", res.text)
                    raise AppException(
                        code="LLM_AUTH_ERROR",
                        message=f"Gemini API request rejected ({res.status_code}): {err_msg}",
                        status_code=502
                    )
                else:
                    raise AppException(
                        code="LLM_PROVIDER_ERROR",
                        message=f"Gemini API returned unexpected status {res.status_code}: {res.text}",
                        status_code=502
                    )
            except httpx.TimeoutException:
                raise AppException(
                    code="LLM_TIMEOUT",
                    message="Gemini API request timed out.",
                    status_code=504
                )
            except AppException:
                raise
            except Exception as exc:
                raise AppException(
                    code="LLM_CONNECTION_ERROR",
                    message=f"Failed to communicate with Gemini API: {str(exc)}",
                    status_code=502
                )
