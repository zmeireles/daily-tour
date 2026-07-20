"""GET /v1/messages/count (owner beta-metrics KPI).

The count provider is dependency-overridden, so no live DB is needed — matches
the repo's route-with-dependency-override test posture (see test_history_route).
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from chat_hub.chat_persistence import get_message_count_provider
from chat_hub.main import app


def test_message_count_returns_windowed_counts() -> None:
    async def fake_provider(range_days):
        assert range_days == 7
        return {"current": 5, "previous": 3}

    app.dependency_overrides[get_message_count_provider] = lambda: fake_provider
    try:
        client = TestClient(app)
        resp = client.get("/v1/messages/count?range_days=7")
    finally:
        app.dependency_overrides.pop(get_message_count_provider, None)

    assert resp.status_code == 200
    assert resp.json() == {"current": 5, "previous": 3}


def test_message_count_defaults_range_to_30() -> None:
    seen: dict[str, int] = {}

    async def fake_provider(range_days):
        seen["range_days"] = range_days
        return {"current": 0, "previous": 0}

    app.dependency_overrides[get_message_count_provider] = lambda: fake_provider
    try:
        client = TestClient(app)
        resp = client.get("/v1/messages/count")
    finally:
        app.dependency_overrides.pop(get_message_count_provider, None)

    assert resp.status_code == 200
    assert seen["range_days"] == 30


def test_message_count_rejects_out_of_range() -> None:
    client = TestClient(app)
    assert client.get("/v1/messages/count?range_days=0").status_code == 422
    assert client.get("/v1/messages/count?range_days=999").status_code == 422
