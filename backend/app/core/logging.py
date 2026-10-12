"""Structured logging configuration for EDXSO system."""

import logging
import sys
from backend.app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configures structured format logging across the application."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers on reload
    if not root_logger.handlers:
        root_logger.addHandler(handler)

    # Specific logger for application
    app_logger = logging.getLogger("edxso")
    app_logger.setLevel(log_level)

    return app_logger


logger = setup_logging()
