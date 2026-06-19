"""Inbound persister + frame helpers (T-4.0.1).

No live DB: the repository calls are monkeypatched and a fake session_scope
is injected, mirroring the repo's SQL-shape/unit posture (search-svc, planner-svc
verify persistence end-to-end via UAT, not a CI Postgres).
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from chat_hub import chat_persistence
from chat_hub.drivers import InboundMessage


class _FakeSession:
    def __init__(self) -> None:
        self.committed = False

    async def commit(self) -> None:
        self.committed = True


class _FakeDriver:
    def __init__(self, *, online: bool = True) -> None:
        self.sent: list[tuple[str, dict[str, object]]] = []
        self._online = online

    async def send_json(self, recipient_id: str, payload: dict[str, object]) -> bool:
        self.sent.append((recipient_id, payload))
        return self._online


def test_parse_guest_id_accepts_uuid_rejects_other() -> None:
    gid = uuid4()
    assert chat_persistence.parse_guest_id(str(gid)) == gid
    assert chat_persistence.parse_guest_id("guest-42") is None
    assert chat_persistence.parse_guest_id("") is None


def test_message_to_dict_shape() -> None:
    created = datetime(2026, 5, 31, 12, 0, tzinfo=UTC)
    row = SimpleNamespace(
        id=uuid4(),
        channel="in_app",
        sender_id="g",
        direction="inbound",
        body="hi",
        created_at=created,
    )
    out = chat_persistence.message_to_dict(row)  # type: ignore[arg-type]
    assert out["direction"] == "inbound"
    assert out["body"] == "hi"
    assert out["ts"] == created.isoformat()


async def test_persister_persists_inbound_and_sends_ack(monkeypatch) -> None:
    guest_id = uuid4()
    thread = SimpleNamespace(id=uuid4())
    msg = SimpleNamespace(id=uuid4(), created_at=datetime.now(UTC))
    captured: dict[str, object] = {}

    async def fake_get_or_create(session, *, guest_id):
        captured["thread_guest_id"] = guest_id
        return thread

    async def fake_insert(session, **kwargs):
        captured.update(kwargs)
        return msg

    monkeypatch.setattr(chat_persistence, "get_or_create_thread", fake_get_or_create)
    monkeypatch.setattr(chat_persistence, "insert_message", fake_insert)

    session = _FakeSession()

    @asynccontextmanager
    async def fake_scope():
        yield session

    driver = _FakeDriver()
    persist = chat_persistence.build_in_app_persister(driver, fake_scope)
    await persist(InboundMessage(channel="in_app", sender_id=str(guest_id), body="hello"))

    # Persisted the inbound frame on the guest's thread.
    assert captured["thread_guest_id"] == guest_id
    assert captured["thread_id"] == thread.id
    assert captured["direction"] == "inbound"
    assert captured["body"] == "hello"
    assert captured["channel"] == "in_app"
    assert session.committed is True

    # Acked back over the socket with a typed receipt (not a host bubble).
    assert len(driver.sent) == 1
    recipient, frame = driver.sent[0]
    assert recipient == str(guest_id)
    assert frame == {"type": "ack", "id": str(msg.id), "ts": msg.created_at.isoformat()}


async def test_persister_skips_non_uuid_client(monkeypatch) -> None:
    called = False

    async def fake_get_or_create(session, *, guest_id):
        nonlocal called
        called = True
        return SimpleNamespace(id=uuid4())

    monkeypatch.setattr(chat_persistence, "get_or_create_thread", fake_get_or_create)

    @asynccontextmanager
    async def fake_scope():
        raise AssertionError("session_scope must not open for a non-uuid client")
        yield  # pragma: no cover

    driver = _FakeDriver()
    persist = chat_persistence.build_in_app_persister(driver, fake_scope)
    await persist(InboundMessage(channel="in_app", sender_id="guest-42", body="hi"))

    assert called is False
    assert driver.sent == []


def _patch_repo(monkeypatch, *, thread, msg, captured):
    async def fake_get_or_create(session, *, guest_id):
        captured["thread_guest_id"] = guest_id
        return thread

    async def fake_insert(session, **kwargs):
        captured.update(kwargs)
        return msg

    monkeypatch.setattr(chat_persistence, "get_or_create_thread", fake_get_or_create)
    monkeypatch.setattr(chat_persistence, "insert_message", fake_insert)


async def test_host_reply_persists_outbound_and_pushes_frame(monkeypatch) -> None:
    guest_id = uuid4()
    thread = SimpleNamespace(id=uuid4())
    msg = SimpleNamespace(id=uuid4(), created_at=datetime.now(UTC))
    captured: dict[str, object] = {}
    _patch_repo(monkeypatch, thread=thread, msg=msg, captured=captured)

    session = _FakeSession()

    @asynccontextmanager
    async def fake_scope():
        yield session

    driver = _FakeDriver(online=True)
    send_reply = chat_persistence.build_host_reply_sender(driver, fake_scope)
    result = await send_reply(guest_id, "see you at 7")

    # Persisted as an outbound host message on the guest's thread.
    assert captured["thread_guest_id"] == guest_id
    assert captured["thread_id"] == thread.id
    assert captured["channel"] == "in_app"
    assert captured["sender_id"] == "host"
    assert captured["direction"] == "outbound"
    assert captured["body"] == "see you at 7"
    assert session.committed is True

    # Pushed the EXACT host-message frame over the socket.
    assert len(driver.sent) == 1
    recipient, frame = driver.sent[0]
    assert recipient == str(guest_id)
    assert frame == {
        "type": "message",
        "id": str(msg.id),
        "from": "host",
        "body": "see you at 7",
        "ts": msg.created_at.isoformat(),
    }

    # Response carries the persisted id/ts + the online delivery flag.
    assert result == {"id": str(msg.id), "ts": msg.created_at.isoformat(), "delivered": True}


async def test_host_reply_offline_guest_still_persists(monkeypatch) -> None:
    guest_id = uuid4()
    thread = SimpleNamespace(id=uuid4())
    msg = SimpleNamespace(id=uuid4(), created_at=datetime.now(UTC))
    captured: dict[str, object] = {}
    _patch_repo(monkeypatch, thread=thread, msg=msg, captured=captured)

    session = _FakeSession()

    @asynccontextmanager
    async def fake_scope():
        yield session

    driver = _FakeDriver(online=False)
    send_reply = chat_persistence.build_host_reply_sender(driver, fake_scope)
    result = await send_reply(guest_id, "offline reply")

    # Committed even though the guest had no live socket (history delivers later).
    assert session.committed is True
    assert captured["direction"] == "outbound"
    assert result["delivered"] is False
