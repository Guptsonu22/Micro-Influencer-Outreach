"""Pytest suite for API v1 endpoints (creators, pagination, outreach duplicate guard)."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_creator_create_and_fetch():
    payload = {
        "channel_id": "UC_TEST_001",
        "title": "Machine Learning Lab",
        "custom_url": "@mllab",
        "channel_url": "https://www.youtube.com/channel/UC_TEST_001",
        "description": "Tutorials on Python and AI",
        "metrics": {
            "subscriber_count": 25000,
            "video_count": 80,
            "view_count": 1200000,
            "estimated_engagement_rate": 3.8
        },
        "enrichment": {
            "contact_email": "Not Found",
            "content_themes": ["Machine Learning", "Python"]
        },
        "classification": {
            "is_qualified": True,
            "fit_score": 85,
            "niche": "Machine Learning",
            "reasons": ["Subscriber count in micro-influencer range", "Target keywords matched"]
        },
        "is_synthetic": False
    }

    # Upsert creator
    create_res = client.post("/api/v1/creators", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["channel_id"] == "UC_TEST_001"
    assert created["metrics"]["subscriber_count"] == 25000

    # Fetch creator by ID
    get_res = client.get("/api/v1/creators/UC_TEST_001")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["title"] == "Machine Learning Lab"
    assert fetched["enrichment"]["contact_email"] == "Not Found"


def test_creator_pagination_and_filtering():
    # Insert a second creator
    client.post("/api/v1/creators", json={
        "channel_id": "UC_TEST_002",
        "title": "Cooking Recipes",
        "channel_url": "https://www.youtube.com/channel/UC_TEST_002",
        "classification": {"is_qualified": False, "niche": "Food"},
        "is_synthetic": False
    })

    # Query paginated list
    res = client.get("/api/v1/creators?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1
    assert data["total"] >= 2

    # Query filtered by qualification
    res_qual = client.get("/api/v1/creators?is_qualified=true")
    assert res_qual.status_code == 200
    qual_data = res_qual.json()
    for item in qual_data["items"]:
        assert item["classification"]["is_qualified"] is True


def test_resource_not_found_standard_error():
    res = client.get("/api/v1/creators/UC_NON_EXISTENT_999")
    assert res.status_code == 404
    error_data = res.json()
    assert "error" in error_data
    assert error_data["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert "UC_NON_EXISTENT_999" in error_data["error"]["message"]


def test_outreach_duplicate_prevention_guard():
    outreach_payload = {
        "creator_id": "c_test_001",
        "channel_id": "UC_TEST_001",
        "channel_type": "email",
        "recipient_contact": "collab@mllab.com",
        "is_simulation": True
    }

    # First attempt succeeds
    first_res = client.post("/api/v1/outreach/logs", json=outreach_payload)
    assert first_res.status_code == 201
    assert first_res.json()["status"] == "simulated"

    # Second attempt to the same channel_id + channel_type must trigger duplicate guard (409 Conflict)
    dup_res = client.post("/api/v1/outreach/logs", json=outreach_payload)
    assert dup_res.status_code == 409
    dup_data = dup_res.json()
    assert dup_data["error"]["code"] == "DUPLICATE_RESOURCE"
