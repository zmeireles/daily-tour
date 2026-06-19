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
from .repository.threads import ThreadSummary, list_threads

logger = logging.getLogger(__name__)

SessionScopeFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]
HistoryProvider = Callable[[UUID], Awaitable[list[dict[str, object]]]]
HostReplySender = Callable[[UUID, str], Awaitable[dict[str, object]]]
ThreadListProvider = Callable[[], Awaitable[list[dict[str, object]]]]


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


def build_host_reply_sender(
    driver: SupportsSendJson,
    session_scope_factory: SessionScopeFactory = session_scope,
) -> HostReplySender:
    """Return the sender the host-reply route calls to answer a guest.

    Persistence is the source of truth: the outbound message is committed
    first, then pushed best-effort over the socket. An offline guest picks
    the reply up via GET /v1/history on reconnect, so a missing socket is
    reported (delivered=False) but never fails the request.
    """

    async def send_host_reply(guest_id: UUID, body: str) -> dict[str, object]:
        async with session_scope_factory() as session:
            thread = await get_or_create_thread(session, guest_id=guest_id)
            msg = await insert_message(
                session,
                thread_id=thread.id,
                channel="in_app",
                sender_id="host",
                direction="outbound",
                body=body,
            )
            await session.commit()
            frame: dict[str, object] = {
                "type": "message",
                "id": str(msg.id),
                "from": "host",
                "body": body,
                "ts": msg.created_at.isoformat(),
            }
        delivered = await driver.send_json(str(guest_id), frame)
        return {"id": str(msg.id), "ts": msg.created_at.isoformat(), "delivered": delivered}

    return send_host_reply


async def default_history_provider(guest_id: UUID) -> list[dict[str, object]]:
    async with session_scope() as session:
        rows = await list_messages_for_guest(session, guest_id=guest_id)
    return [message_to_dict(row) for row in rows]


def get_history_provider() -> HistoryProvider:
    """FastAPI dependency — overridden in tests to avoid a live DB."""
    return default_history_provider


def thread_summary_to_dict(summary: ThreadSummary) -> dict[str, object]:
    """Serialize an owner-inbox thread row for the GET /v1/threads route."""
    return {
        "guest_id": str(summary.guest_id),
        "last_body": summary.last_body,
        "last_ts": summary.last_ts.isoformat() if summary.last_ts is not None else None,
        "updated_at": summary.updated_at.isoformat(),
    }


async def default_thread_list_provider() -> list[dict[str, object]]:
    async with session_scope() as session:
        rows = await list_threads(session)
    return [thread_summary_to_dict(row) for row in rows]


def get_thread_list_provider() -> ThreadListProvider:
    """FastAPI dependency — overridden in tests to avoid a live DB."""
    return default_thread_list_provider


def get_host_reply_sender() -> HostReplySender:
    """FastAPI dependency — built on the same in-app driver singleton the WS
    endpoint registers sockets on, so a reply reaches a live guest socket.
    Overridden in tests to inject a stub driver / avoid a live DB."""
    from .drivers.in_app import get_in_app_driver

    return build_host_reply_sender(get_in_app_driver())


__all__ = [
    "HistoryProvider",
    "HostReplySender",
    "ThreadListProvider",
    "build_host_reply_sender",
    "build_in_app_persister",
    "default_history_provider",
    "default_thread_list_provider",
    "get_history_provider",
    "get_host_reply_sender",
    "get_thread_list_provider",
    "message_to_dict",
    "parse_guest_id",
    "thread_summary_to_dict",
]
