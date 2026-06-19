"""POST /v1/reply/{guest_id} + GET /v1/threads (#281).

The sender / thread-list provider are dependency-overridden, so no live DB is
needed — matches the repo's route-with-dependency-override test posture. The
reply tests build a real `build_host_reply_sender` on a stub driver (with the
repo writes monkeypatched) so the emitted frame + persistence are exercised
through the route, with the stub driver standing in for online/offline.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from chat_hub import chat_persistence
from chat_hub.chat_persistence import (
    get_host_reply_sender,
    get_thread_list_provider,
)
from chat_hub.main import app


class _StubDriver:
    def __init__(self, *, online: bool) -> None:
        self.sent: list[tuple[str, dict[str, object]]] = []
        self._online = online

    async def send_json(self, recipient_id: str, payload: dict[str, object]) -> bool:
        self.sent.append((recipient_id, payload))
        return self._online


class _StubSession:
    def __init__(self) -> None:
        self.committed = False

    async def commit(self) -> None:
        self.committed = True


def _build_sender(monkeypatch, *, online: bool, msg, thread, captured):
    async def fake_get_or_create(session, *, guest_id):
        captured["thread_guest_id"] = guest_id
        return thread

    async def fake_insert(session, **kwargs):
        captured.update(kwargs)
        return msg

    monkeypatch.setattr(chat_persistence, "get_or_create_thread", fake_get_or_create)
    monkeypatch.setattr(chat_persistence, "insert_message", fake_insert)

    @asynccontextmanager
    async def fake_scope():
        yield _StubSession()

    driver = _StubDriver(online=online)
    sender = chat_persistence.build_host_reply_sender(driver, fake_scope)
    return sender, driver


def test_reply_persists_outbound_and_delivers_online(monkeypatch) -> None:
    guest_id = uuid4()
    thread = SimpleNamespace(id=uuid4())
    msg = SimpleNamespace(id=uuid4(), created_at=datetime(2026, 6, 18, 19, 0, tzinfo=UTC))
    captured: dict[str, object] = {}
    sender, driver = _build_sender(
        monkeypatch, online=True, msg=msg, thread=thread, captured=captured
    )

    app.dependency_overrides[get_host_reply_sender] = lambda: sender
    try:
        client = TestClient(app)
        resp = client.post(f"/v1/reply/{guest_id}", json={"body": "see you at 7"})
    finally:
        app.dependency_overrides.pop(get_host_reply_sender, None)

    assert resp.status_code == 200
    assert resp.json() == {
        "id": str(msg.id),
        "ts": msg.created_at.isoformat(),
        "delivered": True,
    }
    # Persisted as an outbound host message on the guest's thread.
    assert captured["thread_guest_id"] == guest_id
    assert captured["sender_id"] == "host"
    assert captured["direction"] == "outbound"
    assert captured["body"] == "see you at 7"
    # The exact host-message frame was pushed over the socket.
    assert driver.sent == [
        (
            str(guest_id),
            {
                "type": "message",
                "id": str(msg.id),
                "from": "host",
                "body": "see you at 7",
                "ts": msg.created_at.isoformat(),
            },
        )
    ]


def test_reply_offline_guest_returns_200_and_not_delivered(monkeypatch) -> None:
    guest_id = uuid4()
    thread = SimpleNamespace(id=uuid4())
    msg = SimpleNamespace(id=uuid4(), created_at=datetime.now(UTC))
    captured: dict[str, object] = {}
    sender, _driver = _build_sender(
        monkeypatch, online=False, msg=msg, thread=thread, captured=captured
    )

    app.dependency_overrides[get_host_reply_sender] = lambda: sender
    try:
        client = TestClient(app)
        resp = client.post(f"/v1/reply/{guest_id}", json={"body": "offline"})
    finally:
        app.dependency_overrides.pop(get_host_reply_sender, None)

    assert resp.status_code == 200
    assert resp.json()["delivered"] is False
    # Still persisted even though no live socket existed.
    assert captured["direction"] == "outbound"


def test_reply_rejects_non_uuid_guest() -> None:
    client = TestClient(app)
    resp = client.post("/v1/reply/not-a-uuid", json={"body": "hi"})
    assert resp.status_code == 400


@pytest.mark.parametrize("payload", [{"body": ""}, {}])
def test_reply_rejects_invalid_body(payload) -> None:
    client = TestClient(app)
    resp = client.post(f"/v1/reply/{uuid4()}", json=payload)
    assert resp.status_code == 422


def test_threads_returns_owner_inbox_shape() -> None:
    rows = [
        {
            "guest_id": str(uuid4()),
            "last_body": "latest message",
            "last_ts": "2026-06-18T19:00:00+00:00",
            "updated_at": "2026-06-18T18:00:00+00:00",
        },
    ]

    async def fake_provider():
        return rows

    app.dependency_overrides[get_thread_list_provider] = lambda: fake_provider
    try:
        client = TestClient(app)
        resp = client.get("/v1/threads")
    finally:
        app.dependency_overrides.pop(get_thread_list_provider, None)

    assert resp.status_code == 200
    assert resp.json() == rows
