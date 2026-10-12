"""Utilities to extract public contact emails from text snippets."""

import re
from typing import Optional

# Standard RFC-compliant public email pattern excluding image file false positives
EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"
)

# Common false-positive extensions/words to discard
IGNORED_DOMAINS = {"example.com", "sample.com", "domain.com"}
IGNORED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def extract_public_email_from_text(text: Optional[str]) -> str:
    """Extracts the first valid public email from a channel description or bio text.

    Returns:
        The matched email string if found.
        'Not Found' if no valid email could be located.
    """
    if not text:
        return "Not Found"

    matches = EMAIL_PATTERN.findall(text)
    for email in matches:
        email_clean = email.strip().lower()
        # Filter out false positives
        if any(email_clean.endswith(ext) for ext in IGNORED_EXTENSIONS):
            continue
        domain = email_clean.split("@")[-1]
        if domain in IGNORED_DOMAINS:
            continue
        return email_clean

    return "Not Found"
