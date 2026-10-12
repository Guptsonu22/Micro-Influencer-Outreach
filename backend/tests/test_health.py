"""Pytest test suite for health check endpoint."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert data["service"] == "EDXSO AI Influencer Outreach System"


def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "integrations" in data
    assert "safety_guardrails" in data
    assert data["safety_guardrails"]["simulation_mode"] is True
    assert data["safety_guardrails"]["allow_live_email_sending"] is False
    assert data["safety_guardrails"]["instagram_dm_automated_sending"] is False
