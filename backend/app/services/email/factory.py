"""Email provider factory with simulation defaults."""

from backend.app.core.config import settings
from backend.app.core.logging import get_logger
from backend.app.services.email.base import BaseEmailProvider
from backend.app.services.email.simulation_provider import SimulationEmailProvider
from backend.app.services.email.smtp_provider import SMTPEmailProvider

logger = get_logger("outreach.email.factory")


def get_email_provider(is_live_requested: bool = False) -> BaseEmailProvider:
    """Selects the appropriate email provider based on configuration and request flags.

    Strict safety rules:
    - If SIMULATION_MODE is True (default) -> Always uses SimulationEmailProvider.
    - If ALLOW_LIVE_EMAIL_SENDING is False (default) -> Always uses SimulationEmailProvider.
    - If is_live_requested is False -> Always uses SimulationEmailProvider.
    - If SMTP credentials are missing -> Falls back safely to SimulationEmailProvider with warning.
    - ONLY if SIMULATION_MODE=False, ALLOW_LIVE_EMAIL_SENDING=True, is_live_requested=True,
      and SMTP credentials exist, activates SMTPEmailProvider.
    """
    if settings.SIMULATION_MODE:
        logger.info("Using SimulationEmailProvider (SIMULATION_MODE=true).")
        return SimulationEmailProvider()

    if not settings.ALLOW_LIVE_EMAIL_SENDING:
        logger.warning("Live sending requested, but ALLOW_LIVE_EMAIL_SENDING=false. Falling back to SimulationEmailProvider.")
        return SimulationEmailProvider()

    if not is_live_requested:
        logger.info("Simulation dispatch requested by operator.")
        return SimulationEmailProvider()

    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        logger.warning("Live sending requested, but SMTP credentials are incomplete. Falling back to SimulationEmailProvider.")
        return SimulationEmailProvider()

    logger.info("Activating live SMTPEmailProvider for %s:%s", settings.SMTP_HOST, settings.SMTP_PORT)
    return SMTPEmailProvider()
