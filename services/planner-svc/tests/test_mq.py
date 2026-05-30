"""Transport-layer tests for ``planner_svc.mq`` — slice A.

These cover the wiring (handler dispatches on plan_id, stub marks ready,
malformed messages don't crash the consumer) without hitting a real
RabbitMQ broker. The integration test against a real broker lives in
``test_mq_integration.py`` (gated on ``DT_RUN_INTEGRATION``).
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from planner_svc import mq


@pytest.fixture
def _fake_message_factory() -> Any:
    """Build a fake AbstractIncomingMessage with the body + context manager shape."""

    def _make(body: bytes) -> Any:
        message = MagicMock()
        message.body = body

        class _Ctx:
            async def __aenter__(self) -> None:
                return None

            async def __aexit__(self, *args: object) -> None:
                return None

        message.process = MagicMock(return_value=_Ctx())
        return message

    return _make


@pytest.mark.asyncio
async def test_handle_requested_dispatches_to_process_stub(
    monkeypatch: pytest.MonkeyPatch, _fake_message_factory: Any
) -> None:
    """Well-formed message routes to _process_stub with the parsed UUID."""
    seen_plan_ids: list[UUID] = []

    async def _capture(plan_id: UUID) -> None:
        seen_plan_ids.append(plan_id)

    monkeypatch.setattr(mq, "_process_stub", _capture)

    plan_id = uuid4()
    body = json.dumps({"plan_id": str(plan_id)}).encode("utf-8")
    message = _fake_message_factory(body)

    await mq._handle_requested(message)

    assert seen_plan_ids == [plan_id]


@pytest.mark.asyncio
async def test_handle_requested_drops_malformed_payload(
    monkeypatch: pytest.MonkeyPatch, _fake_message_factory: Any
) -> None:
    """Malformed JSON / missing plan_id MUST NOT raise — the handler logs + returns."""
    called = AsyncMock()
    monkeypatch.setattr(mq, "_process_stub", called)

    for body in (b"not-json", b"{}", b'{"plan_id": "not-a-uuid"}'):
        message = _fake_message_factory(body)
        # Must not raise.
        await mq._handle_requested(message)

    called.assert_not_called()


@pytest.mark.asyncio
async def test_process_stub_marks_ready(monkeypatch: pytest.MonkeyPatch) -> None:
    """_process_stub calls mark_ready with the stub payload + commits."""
    plan_id = uuid4()
    session = MagicMock()
    session.commit = AsyncMock()
    mark_ready_mock = AsyncMock()

    async def _fake_scope() -> AsyncIterator[Any]:
        yield session

    from contextlib import asynccontextmanager

    monkeypatch.setattr(mq, "session_scope", asynccontextmanager(_fake_scope))
    monkeypatch.setattr(mq, "mark_ready", mark_ready_mock)

    await mq._process_stub(plan_id)

    mark_ready_mock.assert_awaited_once()
    args, _kwargs = mark_ready_mock.call_args
    # mark_ready(session, plan_id, plan_payload)
    assert args[0] is session
    assert args[1] == plan_id
    assert args[2]["stub"] is True
    assert args[2]["steps"] == []
    session.commit.assert_awaited_once()
