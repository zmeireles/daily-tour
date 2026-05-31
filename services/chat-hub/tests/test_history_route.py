"""GET /v1/history/{guest_id} (T-4.0.1).

The history provider is dependency-overridden, so no live DB is needed —
matches the repo's route-with-dependency-override test posture.
"""
from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from chat_hub.chat_persistence import get_history_provider
from chat_hub.main import app


def test_history_returns_messages_for_valid_guest() -> None:
    guest_id = uuid4()
    rows = [
        {
            "id": str(uuid4()),
            "direction": "inbound",
            "body": "hello",
            "ts": "2026-05-31T12:00:00+00:00",
        },
    ]

    async def fake_provider(gid):
        assert gid == guest_id
        return rows

    app.dependency_overrides[get_history_provider] = lambda: fake_provider
    try:
        client = TestClient(app)
        resp = client.get(f"/v1/history/{guest_id}")
    finally:
        app.dependency_overrides.pop(get_history_provider, None)

    assert resp.status_code == 200
    assert resp.json() == {"messages": rows}


def test_history_rejects_non_uuid_guest() -> None:
    client = TestClient(app)
    resp = client.get("/v1/history/not-a-uuid")
    assert resp.status_code == 400
