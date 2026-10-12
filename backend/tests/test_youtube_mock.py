"""Unit tests for YouTube Discovery Service using mocked HTTP responses."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.services.youtube_service import YouTubeDiscoveryService


@pytest.mark.asyncio
async def test_synthetic_demo_records_separation():
    """Verify synthetic generator creates distinct records with is_synthetic=True and valid fields."""
    service = YouTubeDiscoveryService(api_key="mock_key")
    creators = service.generate_synthetic_demo_records(count=50)

    assert len(creators) == 50
    for c in creators:
        assert c["is_synthetic"] is True
        assert c["source_api"] == "Synthetic Demo Generator"
        assert c["enrichment"]["audience_demographics"] == "Unavailable"
        assert "formula" in c["metrics"]["engagement_formula_used"].lower()
        assert 5000 <= c["metrics"]["subscriber_count"] <= 100000


@pytest.mark.asyncio
async def test_subscriber_filtering_and_classification():
    """Verify 5k-100k subscriber bounds correctly qualify or reject channels."""
    service = YouTubeDiscoveryService(api_key="mock_key")

    # type=channel search format: channel ID is at item.id.channelId with kind=youtube#channel
    mock_search_res = {
        "items": [
            {"id": {"kind": "youtube#channel", "channelId": "UC_TOO_FEW"}, "snippet": {"title": "Tiny Dev"}},
            {"id": {"kind": "youtube#channel", "channelId": "UC_QUALIFIED"}, "snippet": {"title": "Micro AI Pro"}},
            {"id": {"kind": "youtube#channel", "channelId": "UC_TOO_MANY"}, "snippet": {"title": "Mega Tech"}},
            {"id": {"kind": "youtube#channel", "channelId": "UC_HIDDEN"}, "snippet": {"title": "Secret Subs"}},
        ]
    }

    mock_channels_res = {
        "items": [
            {
                "id": "UC_TOO_FEW",
                "snippet": {"title": "Tiny Dev", "description": "Small tutorials"},
                "statistics": {"subscriberCount": "2500", "hiddenSubscriberCount": False, "viewCount": "10000"},
                "contentDetails": {"relatedPlaylists": {"uploads": "UULP_1"}}
            },
            {
                "id": "UC_QUALIFIED",
                "snippet": {"title": "Micro AI Pro", "description": "AI Coding email: collab@pro.io"},
                "statistics": {"subscriberCount": "35000", "hiddenSubscriberCount": False, "viewCount": "500000"},
                "contentDetails": {"relatedPlaylists": {"uploads": "UULP_2"}}
            },
            {
                "id": "UC_TOO_MANY",
                "snippet": {"title": "Mega Tech", "description": "Huge channel"},
                "statistics": {"subscriberCount": "2500000", "hiddenSubscriberCount": False, "viewCount": "50000000"},
                "contentDetails": {"relatedPlaylists": {"uploads": "UULP_3"}}
            },
            {
                "id": "UC_HIDDEN",
                "snippet": {"title": "Secret Subs", "description": "Hidden numbers"},
                "statistics": {"hiddenSubscriberCount": True},
                "contentDetails": {"relatedPlaylists": {"uploads": "UULP_4"}}
            },
        ]
    }

    with patch.object(service, "_search_youtube", new_callable=AsyncMock) as mock_search:
        with patch.object(service, "_fetch_channels_batch", new_callable=AsyncMock) as mock_batch:
            with patch.object(service, "_sample_recent_videos", new_callable=AsyncMock) as mock_sample:
                mock_search.return_value = (mock_search_res, 100, None)
                mock_batch.return_value = (mock_channels_res, 1, None)
                mock_sample.return_value = ({
                    "sample_size": 5,
                    "avg_views": 4000.0,
                    "avg_likes": 160.0,
                    "avg_comments": 20.0,
                    "engagement_rate": 4.5,
                    "video_titles": ["Intro to LLMs"]
                }, 2, None)

                creators, summary = await service.execute_discovery_run(
                    queries=["AI tutorials"],
                    target_count=10,
                    min_subscribers=5000,
                    max_subscribers=100000
                )

                assert summary["unique_channels_found"] == 4
                assert summary["qualifying_channels"] == 1
                assert summary["rejected_channels"] == 3
                assert summary["rejection_breakdown"]["too_few_subscribers"] == 1
                assert summary["rejection_breakdown"]["too_many_subscribers"] == 1
                assert summary["rejection_breakdown"]["hidden_subscribers"] == 1

                # Check the qualified creator
                qual_creator = next(c for c in creators if c["channel_id"] == "UC_QUALIFIED")
                assert qual_creator["classification"]["is_qualified"] is True
                assert qual_creator["enrichment"]["contact_email"] == "collab@pro.io"
                assert qual_creator["metrics"]["subscriber_count"] == 35000
                assert qual_creator["metrics"]["estimated_engagement_rate"] == 4.5


@pytest.mark.asyncio
async def test_quota_exceeded_error_handling():
    """Verify that HTTP 403 quota exhaustion triggers graceful stop with instructions."""
    service = YouTubeDiscoveryService(api_key="mock_key")

    with patch.object(service, "_search_youtube", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = ({}, 0, "YouTube Quota Exceeded (403): The request cannot be completed because you have exceeded your quota.")

        creators, summary = await service.execute_discovery_run(
            queries=["AI tutorials"],
            target_count=50
        )

        assert len(creators) == 0
        assert len(summary["api_errors"]) == 1
        assert "quota" in summary["continuation_instructions"].lower()
