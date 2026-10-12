"""Pytest suite for CSV and JSON export endpoints."""

import json
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_influencer_export_json():
    # Insert a test creator
    client.post("/api/v1/creators", json={
        "channel_id": "UC_EXPORT_JSON",
        "title": "JSON Tech",
        "channel_url": "https://youtube.com/c/jsontech",
        "metrics": {"subscriber_count": 22000, "estimated_engagement_rate": 3.4},
        "classification": {"is_qualified": True, "niche": "AI"},
        "is_synthetic": False
    })

    res = client.get("/api/v1/influencers/export?format=json")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/json"
    assert "attachment; filename=edxso_influencers_export.json" in res.headers["content-disposition"]

    data = res.json()
    assert isinstance(data, list)
    assert any(c.get("channel_id") == "UC_EXPORT_JSON" for c in data)


def test_influencer_export_csv():
    # Insert a test creator
    client.post("/api/v1/creators", json={
        "channel_id": "UC_EXPORT_CSV",
        "title": "CSV Tech",
        "channel_url": "https://youtube.com/c/csvtech",
        "metrics": {"subscriber_count": 48000, "estimated_engagement_rate": 4.1},
        "classification": {"is_qualified": True, "niche": "Software Engineering"},
        "is_synthetic": False
    })

    res = client.get("/api/v1/influencers/export?format=csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=edxso_influencers_export.csv" in res.headers["content-disposition"]

    csv_text = res.text
    # Verify header columns
    assert "channel_id" in csv_text
    assert "subscriber_count" in csv_text
    assert "estimated_engagement_rate" in csv_text
    assert "UC_EXPORT_CSV" in csv_text
