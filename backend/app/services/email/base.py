"""Base email provider interface and delivery result model."""

from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel, Field


class EmailDeliveryResult(BaseModel):
    """Immutable result of an email dispatch attempt."""
    success: bool
    status: str = Field(..., description="'sent', 'simulated', 'failed', or 'ambiguous'")
    provider_name: str
    provider_message_id: Optional[str] = None
    provider_response: Optional[str] = None
    error: Optional[str] = None
    is_ambiguous: bool = False
    retryable: bool = False


class BaseEmailProvider(ABC):
    """Abstract interface for email delivery providers."""

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> EmailDeliveryResult:
        """Dispatches an email and returns the delivery result."""
        pass
