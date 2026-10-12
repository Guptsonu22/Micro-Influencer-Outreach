"""Simulated email delivery provider for offline testing and safe dry-runs."""

import asyncio
import uuid
from typing import Optional
from backend.app.core.logging import get_logger
from backend.app.services.email.base import BaseEmailProvider, EmailDeliveryResult

logger = get_logger("outreach.email.simulation")


class SimulationEmailProvider(BaseEmailProvider):
    """Simulates email delivery without sending real emails."""

    def __init__(self, simulated_delay_ms: int = 50):
        self.simulated_delay_ms = simulated_delay_ms
        self.provider_name = "Simulation Engine (Dry-Run)"

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> EmailDeliveryResult:
        """Simulates successful delivery and produces a verifiable simulation message ID."""
        logger.info(
            "Simulating email dispatch to recipient: %s | Subject: %s",
            to_email,
            subject[:40] + ("..." if len(subject) > 40 else "")
        )

        if self.simulated_delay_ms > 0:
            await asyncio.sleep(self.simulated_delay_ms / 1000.0)

        sim_id = f"sim_{uuid.uuid4().hex[:16]}"

        return EmailDeliveryResult(
            success=True,
            status="simulated",
            provider_name=self.provider_name,
            provider_message_id=sim_id,
            provider_response="250 2.0.0 OK: Simulated delivery recorded in audit log",
            error=None,
            is_ambiguous=False,
            retryable=False
        )
