"""Pytest suite for health check endpoints (/health and /api/v1/health)."""

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert data["service"] == "EDXSO AI Influencer Outreach System"
    assert data["health_check"] == "/health"
    assert data["api_v1_health"] == "/api/v1/health"


def test_root_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "integrations" in data
    assert "safety_guardrails" in data
    assert data["safety_guardrails"]["simulation_mode"] is True
    assert data["safety_guardrails"]["allow_live_email_sending"] is False


def test_api_v1_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["safety_guardrails"]["simulation_mode"] is True
