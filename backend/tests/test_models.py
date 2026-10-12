"""Pytest test suite validating Pydantic models and strict data integrity rules."""

import pytest
from backend.app.models.creator import (
    CreatorRecord,
    CreatorMetrics,
    EnrichmentData,
    ClassificationResult,
    OutreachMessage,
)
from backend.app.models.campaign import FilterCriteria, DiscoveryRequest


def test_creator_record_defaults_adhere_to_rules():
    """Verify default values comply with assignment data integrity rules."""
    record = CreatorRecord(
        channel_id="UC1234567890abcdef",
        title="Python AI Dev",
        channel_url="https://www.youtube.com/channel/UC1234567890abcdef"
    )

    # Check email defaults to 'Not Found', not empty string or fake email
    assert record.enrichment.contact_email == "Not Found"

    # Check custom_url defaults to 'Unavailable' if not present
    assert record.custom_url == "Unavailable"

    # Check synthetic flag is False by default for real pipeline integrity
    assert record.is_synthetic is False

    # Check metrics formula is transparently labeled
    assert "formula" in record.metrics.engagement_formula_used.lower() or "avg" in record.metrics.engagement_formula_used.lower()

    # Check outreach simulation flag is True by default
    assert record.outreach.is_simulation is True
    assert record.outreach.status == "draft"


def test_synthetic_data_isolation():
    """Verify synthetic flag separates demo records from real ones."""
    real_creator = CreatorRecord(
        channel_id="UC_REAL_123",
        title="Real Influencer",
        channel_url="https://youtube.com/c/real",
        is_synthetic=False
    )
    demo_creator = CreatorRecord(
        channel_id="UC_DEMO_456",
        title="Synthetic Influencer",
        channel_url="https://youtube.com/c/demo",
        is_synthetic=True
    )

    assert real_creator.is_synthetic is False
    assert demo_creator.is_synthetic is True


def test_filter_criteria_defaults():
    """Ensure micro-influencer tier bounds are properly calibrated."""
    criteria = FilterCriteria()
    assert criteria.min_subscribers == 5000
    assert criteria.max_subscribers == 100000
    assert criteria.min_engagement_rate == 2.0
    assert "AI Engineering" in criteria.target_niches
