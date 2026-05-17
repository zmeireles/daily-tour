"""Health endpoint smoke test."""
from __future__ import annotations

from fastapi.testclient import TestClient

from chat_hub.main import app
from chat_hub.version import __version__


def test_health_returns_ok() -> None:
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"status": "ok", "service": "chat-hub", "version": __version__}
