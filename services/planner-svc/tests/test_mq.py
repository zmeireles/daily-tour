"""Transport + dispatch tests for ``planner_svc.mq`` — slice B.

Tests the consumer handler dispatch (well-formed → _process_plan, malformed
→ dropped silently) and the _process_plan orchestration (orphan row,
WorkerError → mark_rejected, happy path → mark_ready). Real LLM/RAG/DB
calls are stubbed; the produce_plan integration is tested in
``test_plan_worker.py``.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from daily_tour_common import TourPlan, TourStep
from daily_tour_common.models.enums import TourPlanStatus, TourSlot
from daily_tour_common.models.tour import TourParams

from planner_svc import mq
from planner_svc.workers.plan_worker import WorkerError


@pytest.fixture
def _fake_message_factory() -> Any:
    """Build a fake AbstractIncomingMessage with body + context-manager shape."""

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


def _make_tour_plan(plan_id: UUID) -> TourPlan:
    """Minimal TourPlan that satisfies the schema for mark_ready dump."""
    return TourPlan(
        id=plan_id,
        reservation_id=plan_id,
        params=TourParams(
            date="2026-06-01",
            start_time="09:30",
            end_time="15:30",
            party_size=2,
            vehicle="car",
        ),
        status=TourPlanStatus.COMPLETED,
        steps=[
            TourStep(
                slot=TourSlot.MORNING,
                place_id=uuid4(),
                start=datetime(2026, 6, 1, 9, 30, tzinfo=UTC).isoformat(),
                end=datetime(2026, 6, 1, 11, 0, tzinfo=UTC).isoformat(),
                rationale="walk the cliffs",
            )
        ],
        created_at=datetime.now(UTC).isoformat(),
    )


@pytest.mark.asyncio
async def test_handle_requested_dispatches_to_process_plan(
    monkeypatch: pytest.MonkeyPatch, _fake_message_factory: Any
) -> None:
    """Well-formed message routes to _process_plan with the parsed UUID."""
    seen: list[UUID] = []

    async def _capture(plan_id: UUID) -> None:
        seen.append(plan_id)

    monkeypatch.setattr(mq, "_process_plan", _capture)

    plan_id = uuid4()
    body = json.dumps({"plan_id": str(plan_id)}).encode("utf-8")

    await mq._handle_requested(_fake_message_factory(body))

    assert seen == [plan_id]


@pytest.mark.asyncio
async def test_handle_requested_drops_malformed_payload(
    monkeypatch: pytest.MonkeyPatch, _fake_message_factory: Any
) -> None:
    """Malformed JSON / missing plan_id MUST NOT raise — handler logs + returns."""
    called = AsyncMock()
    monkeypatch.setattr(mq, "_process_plan", called)

    for body in (b"not-json", b"{}", b'{"plan_id": "not-a-uuid"}'):
        await mq._handle_requested(_fake_message_factory(body))

    called.assert_not_called()


@pytest.mark.asyncio
async def test_process_plan_orphan_row_is_no_op(monkeypatch: pytest.MonkeyPatch) -> None:
    """Missing row (e.g. message redelivered after row purge) is logged + skipped."""
    session = MagicMock()
    get_by_id_mock = AsyncMock(return_value=None)
    mark_ready_mock = AsyncMock()
    mark_rejected_mock = AsyncMock()
    produce_mock = AsyncMock()

    @asynccontextmanager
    async def _fake_scope() -> AsyncIterator[Any]:
        yield session

    monkeypatch.setattr(mq, "session_scope", _fake_scope)
    monkeypatch.setattr(mq, "get_by_id", get_by_id_mock)
    monkeypatch.setattr(mq, "mark_ready", mark_ready_mock)
    monkeypatch.setattr(mq, "mark_rejected", mark_rejected_mock)
    monkeypatch.setattr(mq, "produce_plan", produce_mock)

    await mq._process_plan(uuid4())

    produce_mock.assert_not_called()
    mark_ready_mock.assert_not_called()
    mark_rejected_mock.assert_not_called()


@pytest.mark.asyncio
async def test_process_plan_marks_rejected_on_worker_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """WorkerError from produce_plan lands in mark_rejected with reason+detail."""
    plan_id = uuid4()
    session = MagicMock()
    session.commit = AsyncMock()
    row = MagicMock()
    row.request_payload = {"wishes": ["eat"], "duration_hours": 4, "vehicle": "car"}

    get_by_id_mock = AsyncMock(return_value=row)
    mark_ready_mock = AsyncMock()
    mark_rejected_mock = AsyncMock()

    async def _produce(*_args: object, **_kwargs: object) -> Any:
        raise WorkerError(reason="llm_unavailable", detail="no key")

    @asynccontextmanager
    async def _fake_scope() -> AsyncIterator[Any]:
        yield session

    monkeypatch.setattr(mq, "session_scope", _fake_scope)
    monkeypatch.setattr(mq, "get_by_id", get_by_id_mock)
    monkeypatch.setattr(mq, "mark_ready", mark_ready_mock)
    monkeypatch.setattr(mq, "mark_rejected", mark_rejected_mock)
    monkeypatch.setattr(mq, "produce_plan", _produce)

    await mq._process_plan(plan_id)

    mark_ready_mock.assert_not_called()
    mark_rejected_mock.assert_awaited_once()
    args, _kwargs = mark_rejected_mock.call_args
    assert args[1] == plan_id
    assert "llm_unavailable" in args[2]
    assert "no key" in args[2]


@pytest.mark.asyncio
async def test_process_plan_marks_ready_on_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """produce_plan returning a TourPlan flows into mark_ready with the dumped model."""
    plan_id = uuid4()
    session = MagicMock()
    session.commit = AsyncMock()
    row = MagicMock()
    row.request_payload = {"wishes": ["eat"], "duration_hours": 4, "vehicle": "car"}

    get_by_id_mock = AsyncMock(return_value=row)
    mark_ready_mock = AsyncMock()
    mark_rejected_mock = AsyncMock()

    plan = _make_tour_plan(plan_id)

    async def _produce(*_args: object, **_kwargs: object) -> Any:
        return plan, []

    @asynccontextmanager
    async def _fake_scope() -> AsyncIterator[Any]:
        yield session

    monkeypatch.setattr(mq, "session_scope", _fake_scope)
    monkeypatch.setattr(mq, "get_by_id", get_by_id_mock)
    monkeypatch.setattr(mq, "mark_ready", mark_ready_mock)
    monkeypatch.setattr(mq, "mark_rejected", mark_rejected_mock)
    monkeypatch.setattr(mq, "produce_plan", _produce)

    await mq._process_plan(plan_id)

    mark_rejected_mock.assert_not_called()
    mark_ready_mock.assert_awaited_once()
    args, _kwargs = mark_ready_mock.call_args
    assert args[1] == plan_id
    # plan_payload should be the dumped model
    assert args[2]["status"] == TourPlanStatus.COMPLETED.value
    assert len(args[2]["steps"]) == 1


@pytest.mark.asyncio
async def test_start_consumer_declares_dead_letter_args() -> None:
    """The main queue dead-letters poison pills to the canonical dt.dlx (#147)."""
    queues: list[dict[str, Any]] = []

    class _FakeQueue:
        async def bind(self, *_a: object, **_k: object) -> None: ...
        async def consume(self, *_a: object, **_k: object) -> None: ...

    class _FakeChannel:
        async def set_qos(self, **_k: object) -> None: ...

        async def declare_exchange(self, *_a: object, **_k: object) -> Any:
            return MagicMock()

        async def declare_queue(self, name: str, **kwargs: object) -> Any:
            queues.append({"name": name, "arguments": kwargs.get("arguments")})
            return _FakeQueue()

    class _FakeConnection:
        async def channel(self) -> Any:
            return _FakeChannel()

    async def _factory(_url: str) -> Any:
        return _FakeConnection()

    await mq.start_consumer(connection_factory=_factory)

    main = next(q for q in queues if q["name"] == mq.REQUESTED_QUEUE)
    assert main["arguments"] == {
        "x-dead-letter-exchange": "dt.dlx",
        "x-dead-letter-routing-key": mq.REQUESTED_QUEUE,
    }
async def test_process_plan_forwards_reservation_id(monkeypatch: pytest.MonkeyPatch) -> None:
    """The row's reservation_id is threaded into produce_plan (#147)."""
    plan_id = uuid4()
    reservation_id = uuid4()
    session = MagicMock()
    session.commit = AsyncMock()
    row = MagicMock()
    row.reservation_id = reservation_id
    row.request_payload = {"wishes": ["eat"], "duration_hours": 4, "vehicle": "car"}

    captured: dict[str, Any] = {}

    async def _produce(**kwargs: Any) -> Any:
        captured.update(kwargs)
        return _make_tour_plan(plan_id), []

    @asynccontextmanager
    async def _fake_scope() -> AsyncIterator[Any]:
        yield session

    monkeypatch.setattr(mq, "session_scope", _fake_scope)
    monkeypatch.setattr(mq, "get_by_id", AsyncMock(return_value=row))
    monkeypatch.setattr(mq, "mark_ready", AsyncMock())
    monkeypatch.setattr(mq, "produce_plan", _produce)

    await mq._process_plan(plan_id)

    assert captured["plan_id"] == plan_id
    assert captured["reservation_id"] == reservation_id
