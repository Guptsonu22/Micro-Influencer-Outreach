"""Unit tests for utility functions (email extraction & engagement metrics)."""

from backend.app.utils.email_extractor import extract_public_email_from_text
from backend.app.utils.metrics import calculate_engagement_rate


def test_email_extraction_found():
    bio = "For business inquiries, reach out at partnerships@techcreator.io or follow my socials!"
    email = extract_public_email_from_text(bio)
    assert email == "partnerships@techcreator.io"


def test_email_extraction_not_found():
    bio = "Just a coding channel. No emails here! Check out my videos."
    email = extract_public_email_from_text(bio)
    assert email == "Not Found"


def test_email_extraction_empty_or_none():
    assert extract_public_email_from_text("") == "Not Found"
    assert extract_public_email_from_text(None) == "Not Found"


def test_calculate_engagement_rate_standard():
    rate, formula = calculate_engagement_rate(avg_likes=400.0, avg_comments=100.0, avg_views=10000.0)
    assert rate == 5.0
    assert "avg_likes" in formula


def test_calculate_engagement_rate_zero_views():
    rate, formula = calculate_engagement_rate(avg_likes=10.0, avg_comments=5.0, avg_views=0.0)
    assert rate is None
    assert "avg_views" in formula


def test_calculate_engagement_rate_none_views():
    rate, formula = calculate_engagement_rate(avg_likes=10.0, avg_comments=5.0, avg_views=None)
    assert rate is None
