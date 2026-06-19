"""Thread-list read path for the owner inbox (#281).

`list_threads` returns one row per guest thread with its latest message body
and timestamp, most-recently-active first — the data the owner inbox renders.
A correlated subquery picks each thread's newest message so a thread with no
messages yet is still returned (last_body/last_ts NULL).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, true
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ChatThreadRow, MessageRow


@dataclass(frozen=True)
class ThreadSummary:
    """One owner-inbox row: a guest's thread + its latest message."""

    guest_id: UUID
    last_body: str | None
    last_ts: datetime | None
    updated_at: datetime


async def list_threads(session: AsyncSession) -> list[ThreadSummary]:
    """Return every thread with its latest message, newest activity first."""
    latest = (
        select(MessageRow)
        .where(MessageRow.thread_id == ChatThreadRow.id)
        .order_by(MessageRow.created_at.desc(), MessageRow.id.desc())
        .limit(1)
        .lateral()
    )
    stmt = (
        select(
            ChatThreadRow.guest_id,
            ChatThreadRow.updated_at,
            latest.c.body.label("last_body"),
            latest.c.created_at.label("last_ts"),
        )
        .select_from(ChatThreadRow)
        .outerjoin(latest, true())
        .order_by(latest.c.created_at.desc().nullslast(), ChatThreadRow.updated_at.desc())
    )
    result = await session.execute(stmt)
    return [
        ThreadSummary(
            guest_id=row.guest_id,
            last_body=row.last_body,
            last_ts=row.last_ts,
            updated_at=row.updated_at,
        )
        for row in result
    ]


__all__ = ["ThreadSummary", "list_threads"]
