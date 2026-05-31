"""Wiring between the in-app WS driver and the `chat` schema (T-4.0.1).

Two concerns live here so `main.py` stays a thin factory:

1. `build_in_app_persister` — the `on_receive` callback the in-app driver
   fires for every inbound frame: open/find the guest's thread, persist the
   message, then push a typed `ack` frame back over the same socket. The ack
   is a delivery receipt (NOT echoed as a host bubble) so the guest sees
   they are talking to a human host, not a bot (UAT-G08 criterion).
2. `default_history_provider` / `get_history_provider` — the read side the
   GET /v1/history/{guest_id} route depends on (overridable in tests).

The frame protocol (server → client) is typed JSON:
    {"type": "ack", "id": "<uuid>", "ts": "<iso8601>"}          delivery receipt
    {"type": "message", "id", "from": "host", "body", "ts"}     host/system message
The legacy `{"body": …}` shape (driver.send) stays for protocol conformance.
"""
from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from contextlib import AbstractAsyncContextManager
from typing import Protocol
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from .db import session_scope
from .drivers import InboundCallback, InboundMessage
from .models import MessageRow
from .repository.messages import (
    get_or_create_thread,
    insert_message,
    list_messages_for_guest,
)

logger = logging.getLogger(__name__)

SessionScopeFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]
HistoryProvider = Callable[[UUID], Awaitable[list[dict[str, object]]]]


class SupportsSendJson(Protocol):
    """Minimal driver surface the persister needs (in_app satisfies it)."""

    async def send_json(self, recipient_id: str, payload: dict[str, object]) -> bool: ...


def parse_guest_id(client_id: str) -> UUID | None:
    """Coerce the WS client_id (JWT `sub`) to a guest UUID, or None if it
    isn't one — non-UUID ids (e.g. test fixtures) skip persistence rather
    than crash the socket loop."""
    try:
        return UUID(client_id)
    except (ValueError, AttributeError):
        return None


def message_to_dict(row: MessageRow) -> dict[str, object]:
    """Serialize a persisted message for the history read route / frames."""
    return {
        "id": str(row.id),
        "channel": row.channel,
        "sender_id": row.sender_id,
        "direction": row.direction,
        "body": row.body,
        "ts": row.created_at.isoformat(),
    }


def build_in_app_persister(
    driver: SupportsSendJson,
    session_scope_factory: SessionScopeFactory = session_scope,
) -> InboundCallback:
    """Return the on_receive callback that persists inbound frames + acks."""

    async def on_inbound(inbound: InboundMessage) -> None:
        guest_id = parse_guest_id(inbound.sender_id)
        if guest_id is None:
            logger.warning(
                "in_app inbound with non-uuid client_id — skipping persistence",
                extra={"sender_id": inbound.sender_id},
            )
            return
        async with session_scope_factory() as session:
            thread = await get_or_create_thread(session, guest_id=guest_id)
            msg = await insert_message(
                session,
                thread_id=thread.id,
                channel=inbound.channel,
                sender_id=inbound.sender_id,
                direction="inbound",
                body=inbound.body,
                external_message_id=inbound.external_message_id,
            )
            await session.commit()
            ack: dict[str, object] = {
                "type": "ack",
                "id": str(msg.id),
                "ts": msg.created_at.isoformat(),
            }
        await driver.send_json(inbound.sender_id, ack)

    return on_inbound


async def default_history_provider(guest_id: UUID) -> list[dict[str, object]]:
    async with session_scope() as session:
        rows = await list_messages_for_guest(session, guest_id=guest_id)
    return [message_to_dict(row) for row in rows]


def get_history_provider() -> HistoryProvider:
    """FastAPI dependency — overridden in tests to avoid a live DB."""
    return default_history_provider


__all__ = [
    "HistoryProvider",
    "build_in_app_persister",
    "default_history_provider",
    "get_history_provider",
    "message_to_dict",
    "parse_guest_id",
]
