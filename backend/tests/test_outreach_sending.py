"""Tests for outreach sending layer, 7-stage gatekeeper, simulation, and duplicate prevention."""

import asyncio
from datetime import datetime
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import db_manager
from backend.app.services.outreach_service import outreach_service, OutreachGatekeeperError
from backend.app.schemas.outreach import OutreachSendRequest, OutreachChannelType


@pytest.fixture(autouse=True)
async def setup_test_db():
    """Resets database state before each test."""
    db_manager.use_in_memory = True
    db_manager._in_memory_creators.clear()
    db_manager._in_memory_messages.clear()
    db_manager._in_memory_outreach_logs.clear()
    db_manager._outreach_lock = None
    yield


def create_mock_creator(
    channel_id: str = "UC_test_123",
    title: str = "AI Tech Reviews",
    email: str = "contact@aitechreviews.com",
    is_qualified: bool = True,
    decision: str = "pass"
) -> dict:
    return {
        "channel_id": channel_id,
        "title": title,
        "custom_url": "@aitechreviews",
        "channel_url": f"https://www.youtube.com/channel/{channel_id}",
        "description": "Tech and AI tutorials channel",
        "country": "US",
        "thumbnail_url": "https://example.com/thumb.jpg",
        "metrics": {
            "subscriber_count": 25000,
            "is_subscriber_count_hidden": False,
            "video_count": 80,
            "view_count": 1200000,
            "recent_video_sample_size": 10,
            "avg_recent_views": 15000.0,
            "avg_recent_likes": 600.0,
            "avg_recent_comments": 45.0,
            "estimated_engagement_rate": 4.3,
            "is_estimated": True,
            "engagement_formula_used": "((avg_likes + avg_comments) / avg_views) * 100",
            "observation_window": "Last 10 public uploads",
            "metric_timestamp": datetime.utcnow()
        },
        "enrichment": {
            "contact_email": email,
            "email_source": "description",
            "social_links": {},
            "content_themes": ["machine learning", "python", "ai tools"],
            "recent_video_titles": ["How to build LLM apps with Python"],
            "audience_demographics": "Unavailable",
            "enriched_at": datetime.utcnow(),
            "enrichment_source": "YouTube Snippet"
        },
        "classification": {
            "decision": decision,
            "is_qualified": is_qualified,
            "fit_score": 85,
            "niche": "Technology & Artificial Intelligence",
            "reasons": ["Subscriber count in 5k-100k range", "Relevant AI content"],
            "evaluated_at": datetime.utcnow()
        },
        "outreach": {
            "email_subject": "Collaboration with EDXSO x AI Tech Reviews",
            # Exactly 70 words body (satisfies 60-90 words gate)
            "email_body": (
                "Hi AI Tech Reviews, I came across your recent tutorial on building LLM apps with Python and "
                "was impressed by how clearly you explained complex AI concepts to your community. At EDXSO, "
                "we build career-focused AI engineering simulations and practical developer workflows. We would "
                "love to sponsor an upcoming video on your channel. We offer competitive creator compensation "
                "plus free Pro membership for your subscribers. Would you be open to collaborating this month?"
            ),
            "instagram_dm": "Hi AI Tech Reviews, love your AI tutorials! We'd love to sponsor an upcoming video with EDXSO. Interested?",
            "generated_at": datetime.utcnow(),
            "status": "draft",
            "is_simulation": True,
            "error_message": None
        },
        "is_synthetic": False,
        "source_name": "YouTube Data API v3",
        "collected_at": datetime.utcnow(),
        "retrieved_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }


# =====================================================================
# 1. Missing Email Rejection Test (Gate 2)
# =====================================================================
@pytest.mark.asyncio
async def test_missing_email_rejection():
    """Gate 2: Rejects dispatches when contact_email is 'Not Found', empty, or malformed."""
    creator = create_mock_creator(channel_id="UC_no_email", email="Not Found")
    await db_manager.upsert_creator(creator)

    req = OutreachSendRequest(
        channel_id="UC_no_email",
        channel_type=OutreachChannelType.EMAIL
    )

    with pytest.raises(OutreachGatekeeperError) as exc_info:
        await outreach_service.dispatch_outreach(req)

    assert exc_info.value.status_code == 400
    assert "Gate #2" in str(exc_info.value.message)


# =====================================================================
# 2. Unqualified Influencer Gate & Override Test (Gate 1)
# =====================================================================
@pytest.mark.asyncio
async def test_unqualified_creator_gate_and_override():
    """Gate 1: Blocks unqualified creators unless explicit override is provided."""
    creator = create_mock_creator(channel_id="UC_unqualified", is_qualified=False, decision="fail")
    await db_manager.upsert_creator(creator)

    # Attempt without override -> fails
    req_blocked = OutreachSendRequest(
        channel_id="UC_unqualified",
        allow_ineligible_override=False
    )
    with pytest.raises(OutreachGatekeeperError) as exc_info:
        await outreach_service.dispatch_outreach(req_blocked)

    assert "Gate #1" in str(exc_info.value.message)

    # Attempt with explicit override -> succeeds in simulation
    req_override = OutreachSendRequest(
        channel_id="UC_unqualified",
        allow_ineligible_override=True
    )
    res = await outreach_service.dispatch_outreach(req_override)
    assert res.status == "simulated"
    assert res.is_simulation is True


# =====================================================================
# 3. Word Count Check Gate Test (Gate 4)
# =====================================================================
@pytest.mark.asyncio
async def test_word_count_check_gate():
    """Gate 4: Rejects drafts outside the 60-90 words range."""
    creator = create_mock_creator(channel_id="UC_bad_words")
    # Set a short 10-word body
    creator["outreach"]["email_body"] = "Hi there, let's collaborate on an EDXSO sponsored video together soon."
    await db_manager.upsert_creator(creator)

    req = OutreachSendRequest(channel_id="UC_bad_words")
    with pytest.raises(OutreachGatekeeperError) as exc_info:
        await outreach_service.dispatch_outreach(req)

    assert "Gate #4" in str(exc_info.value.message)


# =====================================================================
# 4. Simulated Email Delivery Success
# =====================================================================
@pytest.mark.asyncio
async def test_simulated_email_delivery_success():
    """Simulates delivery successfully and records persistent simulation status."""
    creator = create_mock_creator(channel_id="UC_sim_test")
    await db_manager.upsert_creator(creator)

    req = OutreachSendRequest(channel_id="UC_sim_test", campaign_id="camp_q4")
    res = await outreach_service.dispatch_outreach(req)

    assert res.status == "simulated"
    assert res.is_simulation is True
    assert res.provider_name.startswith("Simulation")
    assert res.provider_message_id is not None
    assert res.provider_message_id.startswith("sim_")

    # Verify audit log was created
    logs = await db_manager.list_outreach_logs(limit=10)
    assert len(logs) == 1
    assert logs[0]["channel_id"] == "UC_sim_test"
    assert logs[0]["status"] == "simulated"


# =====================================================================
# 5. Duplicate Prevention: Campaign-plus-Creator Key (Gate 6)
# =====================================================================
@pytest.mark.asyncio
async def test_duplicate_prevention_same_campaign():
    """Gate 6: Rejects subsequent dispatches to the same creator under the same campaign."""
    creator = create_mock_creator(channel_id="UC_dup_test")
    await db_manager.upsert_creator(creator)

    req1 = OutreachSendRequest(channel_id="UC_dup_test", campaign_id="camp_q4")
    res1 = await outreach_service.dispatch_outreach(req1)
    assert res1.status == "simulated"

    # Second dispatch to same creator under same campaign must fail
    req2 = OutreachSendRequest(channel_id="UC_dup_test", campaign_id="camp_q4")
    with pytest.raises(Exception) as exc_info:
        await outreach_service.dispatch_outreach(req2)

    assert "already exists" in str(exc_info.value).lower() or "duplicate" in str(exc_info.value).lower()


# =====================================================================
# 6. Concurrent Request Atomic Lock Test
# =====================================================================
@pytest.mark.asyncio
async def test_concurrent_duplicate_atomic_lock():
    """Verifies that race conditions from concurrent dispatches are caught atomically."""
    creator = create_mock_creator(channel_id="UC_concurrent")
    await db_manager.upsert_creator(creator)

    req = OutreachSendRequest(channel_id="UC_concurrent", campaign_id="camp_race")

    # Launch two concurrent dispatches
    results = await asyncio.gather(
        outreach_service.dispatch_outreach(req),
        outreach_service.dispatch_outreach(req),
        return_exceptions=True
    )

    successes = [r for r in results if not isinstance(r, Exception)]
    failures = [r for r in results if isinstance(r, Exception)]

    assert len(successes) == 1, "Exactly one concurrent attempt must succeed"
    assert len(failures) == 1, "The second concurrent attempt must be rejected by atomic lock"


# =====================================================================
# 7. Live Send Approval Requirement Test (Gate 5)
# =====================================================================
@pytest.mark.asyncio
async def test_live_send_unconfirmed_approval_blocked():
    """Gate 5: Rejects live email request if confirmed_live_approval is False."""
    creator = create_mock_creator(channel_id="UC_live_blocked")
    await db_manager.upsert_creator(creator)

    req = OutreachSendRequest(
        channel_id="UC_live_blocked",
        is_live_requested=True,
        confirmed_live_approval=False  # Operator did not confirm
    )

    with pytest.raises(OutreachGatekeeperError) as exc_info:
        await outreach_service.dispatch_outreach(req)

    assert "Gate #5" in str(exc_info.value.message)


# =====================================================================
# 8. Instagram DM Manual Copy Workflow (Meta Policy Compliance)
# =====================================================================
@pytest.mark.asyncio
async def test_instagram_dm_automated_send_blocked():
    """Enforces that Instagram DM dispatches return manual copy draft and block bot automation."""
    creator = create_mock_creator(channel_id="UC_ig_test")
    await db_manager.upsert_creator(creator)

    req = OutreachSendRequest(
        channel_id="UC_ig_test",
        channel_type=OutreachChannelType.INSTAGRAM_DM
    )

    res = await outreach_service.dispatch_outreach(req)
    assert res.channel_type == "instagram_dm"
    assert res.instagram_dm_copy is not None
    assert res.is_simulation is True
    assert "Manual Copy" in res.provider_name
    assert "Meta" in (res.policy_notice or "")


# =====================================================================
# 9. Outreach CSV Export Endpoint Test
# =====================================================================
@pytest.mark.asyncio
async def test_outreach_csv_export_endpoint():
    """Verifies that GET /api/v1/outreach/export returns valid CSV data."""
    creator = create_mock_creator(channel_id="UC_export_test")
    await db_manager.upsert_creator(creator)

    req = OutreachSendRequest(channel_id="UC_export_test")
    await outreach_service.dispatch_outreach(req)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/outreach/export?format=csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "Log ID,Channel ID" in response.text
        assert "UC_export_test" in response.text
