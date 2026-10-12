"""Comprehensive unit tests for Filtering, Classification, and Enrichment (Phase 4)."""

import pytest
from backend.app.schemas.campaign import FilterCriteria
from backend.app.services.filter_service import filter_service
from backend.app.services.enrichment_service import enrichment_service


def test_filtering_boundaries_subscriber_count():
    """Verify exact lower and upper boundaries (5,000 - 100,000) for micro-influencer tier."""
    rules = FilterCriteria(min_subscribers=5000, max_subscribers=100000)

    # Below boundary (4,999) -> Fail
    creator_4999 = {
        "title": "Python Dev",
        "metrics": {"subscriber_count": 4999, "is_subscriber_count_hidden": False},
        "enrichment": {"content_themes": ["Python"]}
    }
    res_4999 = filter_service.evaluate_influencer(creator_4999, rules)
    assert res_4999.follower_count.status == "fail"
    assert "below" in res_4999.follower_count.reason.lower()
    assert res_4999.decision == "fail"

    # Exact lower boundary (5,000) -> Pass
    creator_5000 = {
        "title": "Python Dev",
        "metrics": {"subscriber_count": 5000, "is_subscriber_count_hidden": False, "estimated_engagement_rate": 3.0},
        "enrichment": {"content_themes": ["Python"], "contact_email": "dev@python.org"}
    }
    res_5000 = filter_service.evaluate_influencer(creator_5000, rules)
    assert res_5000.follower_count.status == "pass"

    # Exact upper boundary (100,000) -> Pass
    creator_100k = {
        "title": "AI Labs",
        "metrics": {"subscriber_count": 100000, "is_subscriber_count_hidden": False, "estimated_engagement_rate": 3.5},
        "enrichment": {"content_themes": ["Artificial Intelligence"], "contact_email": "collab@ailabs.io"}
    }
    res_100k = filter_service.evaluate_influencer(creator_100k, rules)
    assert res_100k.follower_count.status == "pass"

    # Above boundary (100,001) -> Fail
    creator_100001 = {
        "title": "Mega AI",
        "metrics": {"subscriber_count": 100001, "is_subscriber_count_hidden": False},
        "enrichment": {"content_themes": ["AI"]}
    }
    res_100001 = filter_service.evaluate_influencer(creator_100001, rules)
    assert res_100001.follower_count.status == "fail"
    assert "exceeds" in res_100001.follower_count.reason.lower()
    assert res_100001.decision == "fail"


def test_hidden_subscriber_count_decision():
    """Verify hidden subscriber counts fail with transparent reason."""
    rules = FilterCriteria()
    creator_hidden = {
        "title": "Stealth Dev",
        "metrics": {"subscriber_count": None, "is_subscriber_count_hidden": True},
        "enrichment": {"content_themes": ["Python"]}
    }
    res = filter_service.evaluate_influencer(creator_hidden, rules)
    assert res.follower_count.status == "fail"
    assert "hidden" in res.follower_count.reason.lower()
    assert res.decision == "fail"


def test_unavailable_optional_metric_does_not_reject_creator():
    """Verify that a creator is not rejected solely because engagement rate is unavailable."""
    rules = FilterCriteria(require_engagement_rate=False)
    creator = {
        "title": "Senior AI Architect",
        "metrics": {
            "subscriber_count": 25000,
            "is_subscriber_count_hidden": False,
            "estimated_engagement_rate": None,  # Optional metric is unavailable
            "avg_recent_likes": None,
            "avg_recent_comments": None
        },
        "enrichment": {
            "content_themes": ["Machine Learning", "PyTorch"],
            "contact_email": "architect@ai.io"
        }
    }
    res = filter_service.evaluate_influencer(creator, rules)
    # Engagement should be 'needs_review', not 'fail'
    assert res.engagement.status == "needs_review"
    assert "unavailable" in res.engagement.reason.lower()
    # Creator decision should be 'needs_review', not 'fail'
    assert res.decision != "fail"
    assert res.decision == "needs_review"


def test_classification_stores_reason_for_every_criterion():
    """Verify that decisions contain separate criterion results with non-empty reasons."""
    rules = FilterCriteria()
    creator = {
        "title": "FastAPI Guide",
        "description": "Tutorials on Python FastAPI backend and Docker deployment",
        "metrics": {"subscriber_count": 32000, "is_subscriber_count_hidden": False, "estimated_engagement_rate": 4.1},
        "enrichment": {"content_themes": ["Python Engineering"], "contact_email": "fastapi@tutorial.com"}
    }
    res = filter_service.evaluate_influencer(creator, rules)

    assert res.niche_relevance is not None
    assert len(res.niche_relevance.reason) > 0

    assert res.follower_count is not None
    assert len(res.follower_count.reason) > 0

    assert res.engagement is not None
    assert len(res.engagement.reason) > 0

    assert res.contact_availability is not None
    assert len(res.contact_availability.reason) > 0

    assert len(res.reasons) >= 4
    assert res.decision in ["pass", "fail", "needs_review"]


def test_invalid_email_syntax_validation():
    """Verify email validation rejects invalid syntax and prevents email guessing."""
    assert enrichment_service.is_valid_email_syntax("user@example.com") is True
    assert enrichment_service.is_valid_email_syntax("invalid-email") is False
    assert enrichment_service.is_valid_email_syntax("Not Found") is False
    assert enrichment_service.is_valid_email_syntax("") is False
    assert enrichment_service.is_valid_email_syntax(None) is False


def test_manual_contact_email_enrichment():
    """Verify manually reviewed email updates status to manual_review and triggers contact pass."""
    creator = {
        "channel_id": "UC_TEST_MANUAL",
        "title": "Python Dev",
        "channel_url": "https://youtube.com/channel/UC_TEST_MANUAL",
        "metrics": {"subscriber_count": 15000, "is_subscriber_count_hidden": False, "estimated_engagement_rate": 3.0},
        "enrichment": {
            "contact_email": "Not Found",
            "email_verification_status": "none"
        }
    }

    enriched = enrichment_service.enrich_profile(
        creator=creator,
        manual_email="sponsor@pythondev.io",
        manual_email_source_url="https://pythondev.io/about"
    )

    assert enriched["enrichment"]["contact_email"] == "sponsor@pythondev.io"
    assert enriched["enrichment"]["email_verification_status"] == "manual_review"
    assert enriched["enrichment"]["email_source_url"] == "https://pythondev.io/about"
    assert enriched["enrichment"]["audience_demographics"] == "Unavailable"
