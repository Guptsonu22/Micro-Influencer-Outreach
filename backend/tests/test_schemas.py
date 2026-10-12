"""Pytest suite validating data integrity rules across all schemas."""

from backend.app.schemas.influencer import (
    InfluencerCreate,
    InfluencerMetricsSchema,
    InfluencerEnrichmentSchema,
    InfluencerClassificationSchema
)
from backend.app.schemas.discovery import DiscoveryRunCreate
from backend.app.schemas.campaign import CampaignCreate
from backend.app.schemas.message import GeneratedMessageCreate
from backend.app.schemas.outreach import OutreachLogCreate


def test_missing_values_preserved_distinctly():
    """Verify that None (missing) is strictly distinguished from 0 in metrics."""
    metrics_missing = InfluencerMetricsSchema(subscriber_count=None, view_count=None)
    assert metrics_missing.subscriber_count is None
    assert metrics_missing.view_count is None

    metrics_zero = InfluencerMetricsSchema(subscriber_count=0, view_count=0)
    assert metrics_zero.subscriber_count == 0
    assert metrics_zero.view_count == 0

    assert metrics_missing.subscriber_count != metrics_zero.subscriber_count


def test_email_never_guessed():
    """Verify that contact_email falls back to 'Not Found' and never stores guessed or empty placeholders."""
    enrichment_empty = InfluencerEnrichmentSchema(contact_email="")
    assert enrichment_empty.contact_email == "Not Found"

    enrichment_none = InfluencerEnrichmentSchema(contact_email="null")
    assert enrichment_none.contact_email == "Not Found"

    enrichment_real = InfluencerEnrichmentSchema(contact_email="contact@realcreator.io")
    assert enrichment_real.contact_email == "contact@realcreator.io"


def test_audience_demographics_unavailable():
    """Verify that audience demographics is explicitly marked Unavailable."""
    enrichment = InfluencerEnrichmentSchema()
    assert enrichment.audience_demographics == "Unavailable"


def test_influencer_provenance_and_source_url():
    """Verify that source_url and source_name default cleanly."""
    influencer = InfluencerCreate(
        channel_id="UC1234567890",
        title="Python AI Dev",
        channel_url="https://www.youtube.com/channel/UC1234567890"
    )
    assert influencer.source_url == "https://www.youtube.com/channel/UC1234567890"
    assert influencer.source_name == "YouTube Data API v3"
    assert influencer.is_synthetic is False


def test_all_domain_schemas_instantiation():
    """Verify DiscoveryRun, Campaign, GeneratedMessage, and OutreachLog schemas."""
    disc = DiscoveryRunCreate(query="Python Tutorials", target_count=50)
    assert disc.query == "Python Tutorials"

    camp = CampaignCreate(name="Q4 Outreach", target_niche="AI Development")
    assert camp.name == "Q4 Outreach"

    msg = GeneratedMessageCreate(
        creator_id="c_1",
        channel_id="UC1",
        email_subject="Sponsorship Proposal",
        email_body="Hello...",
        instagram_dm="Hey..."
    )
    assert msg.channel_id == "UC1"

    outreach = OutreachLogCreate(
        creator_id="c_1",
        channel_id="UC1",
        recipient_contact="test@example.com"
    )
    assert outreach.is_simulation is True
