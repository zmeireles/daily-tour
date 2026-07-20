"""CRUD for the `chat` schema (T-4.0.1).

Two write paths and one read path:

- `get_or_create_thread` — find the guest's thread or open one on first
  contact (the "thread auto-created on first inbound" acceptance).
- `insert_message` — append one frame (inbound or outbound) to a thread.
- `list_messages_for_guest` — chronological history for the BFF read route.

Callers own the transaction boundary: writes `flush()` so the id is
assigned, but the route/handler calls `commit()`.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ChatThreadRow, MessageRow


async def get_or_create_thread(session: AsyncSession, *, guest_id: UUID) -> ChatThreadRow:
    """Return the guest's thread, creating it on first contact."""
    stmt = select(ChatThreadRow).where(ChatThreadRow.guest_id == guest_id)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        return existing
    now = datetime.now(UTC)
    row = ChatThreadRow(id=uuid4(), guest_id=guest_id, created_at=now, updated_at=now)
    session.add(row)
    await session.flush()
    return row


async def insert_message(
    session: AsyncSession,
    *,
    thread_id: UUID,
    channel: str,
    sender_id: str,
    direction: str,
    body: str,
    external_message_id: str | None = None,
) -> MessageRow:
    """Append one message to a thread and return the persisted entity."""
    row = MessageRow(
        id=uuid4(),
        thread_id=thread_id,
        channel=channel,
        sender_id=sender_id,
        direction=direction,
        body=body,
        external_message_id=external_message_id,
        created_at=datetime.now(UTC),
    )
    session.add(row)
    await session.flush()
    return row


async def list_messages_for_guest(
    session: AsyncSession,
    *,
    guest_id: UUID,
    limit: int = 200,
) -> list[MessageRow]:
    """Return the guest's messages oldest-first (chat history read path)."""
    stmt = (
        select(MessageRow)
        .join(ChatThreadRow, MessageRow.thread_id == ChatThreadRow.id)
        .where(ChatThreadRow.guest_id == guest_id)
        .order_by(MessageRow.created_at.asc(), MessageRow.id.asc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def count_messages_windowed(
    session: AsyncSession, *, range_days: int
) -> tuple[int, int]:
    """Count guest (inbound) messages in the current `range_days` window and the
    equal window immediately before it, in one grouped scan. Returns
    ``(current, previous)``.

    Powers the owner dashboard's "messages" KPI as a measure of guest demand, so
    the platform's own outbound (host) replies are excluded — a host answering
    must not inflate the tile. There is no beta discriminator on ``chat.message``;
    during the F&F beta all inbound traffic is beta traffic.
    """
    now = datetime.now(UTC)
    cur_start = now - timedelta(days=range_days)
    prev_start = now - timedelta(days=range_days * 2)
    period = case(
        (MessageRow.created_at >= cur_start, "current"),
        else_="previous",
    ).label("period")
    stmt = (
        select(period, func.count().label("cnt"))
        .where(
            MessageRow.created_at >= prev_start,
            MessageRow.direction == "inbound",
        )
        .group_by(period)
    )
    result = await session.execute(stmt)
    current = 0
    previous = 0
    for row in result:
        if row.period == "current":
            current = int(row.cnt)
        else:
            previous = int(row.cnt)
    return current, previous


__all__ = [
    "count_messages_windowed",
    "get_or_create_thread",
    "insert_message",
    "list_messages_for_guest",
]
