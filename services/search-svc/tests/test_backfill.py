"""Tests for the backfill script."""
from __future__ import annotations

import json
from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

from search_svc.scripts.backfill import ROUTING_KEY, backfill


def _make_place(n: int) -> MagicMock:
    place = MagicMock()
    place.id = UUID(f"c0000001-0000-4000-a000-{n:012d}")
    place.name = {"en": f"Place {n}"}
    place.description = {"en": f"Description {n}"}
    place.address = f"Address {n}, São Miguel"
    return place


def _session_ctx(places: list[Any]) -> Any:
    """Async context manager that yields a mock DB session returning `places`."""
    mock_result = MagicMock()
    mock_result.scalars.return_value = iter(places)
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    @asynccontextmanager
    async def _ctx() -> Any:
        yield mock_session

    return _ctx()


def _connection_factory(captured: list[tuple[str, bytes]]) -> Any:
    """Mock connection factory that appends (routing_key, body) to `captured`."""

    async def publish(message: Any, *, routing_key: str) -> None:
        captured.append((routing_key, message.body))

    mock_exchange = AsyncMock()
    mock_exchange.publish = publish

    mock_channel = AsyncMock()
    mock_channel.declare_exchange = AsyncMock(return_value=mock_exchange)

    mock_connection = AsyncMock()
    mock_connection.channel = AsyncMock(return_value=mock_channel)
    mock_connection.close = AsyncMock()

    async def factory(url: str) -> Any:
        return mock_connection

    return factory


class TestBackfill:
    async def test_publishes_n_messages(self) -> None:
        places = [_make_place(i) for i in range(1, 29)]  # 28 seeded places
        captured: list[tuple[str, bytes]] = []

        count = await backfill(
            session_context=_session_ctx(places),
            connection_factory=_connection_factory(captured),
        )

        assert count == 28
        assert len(captured) == 28
        for routing_key, body in captured:
            assert routing_key == ROUTING_KEY
            payload = json.loads(body)
            assert "place_id" in payload

    async def test_idempotent(self) -> None:
        """Re-running backfill is safe; the worker upserts on place_id."""
        places = [_make_place(1)]
        captured: list[tuple[str, bytes]] = []
        factory = _connection_factory(captured)

        first = await backfill(
            session_context=_session_ctx(places),
            connection_factory=factory,
        )
        second = await backfill(
            session_context=_session_ctx(places),
            connection_factory=factory,
        )

        assert first == 1
        assert second == 1
        assert len(captured) == 2  # same event published twice; worker upserts
