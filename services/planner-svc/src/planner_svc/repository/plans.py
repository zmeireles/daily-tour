"""CRUD + state transitions for planner.tour_plan (T-3.0.3).

Three operations cover the async flow:

- `insert_queued` — POST /v1/tour-plans handler creates a row in `queued`
  with the inbound payload, before publishing tour-plan.requested.
- `mark_ready` / `mark_rejected` — terminal transitions written by the
  worker once the LLM + validators finish. `mark_rejected` stores an
  `{error: "…"}` JSON payload so the GET endpoint can surface the reason
  without a separate column.
- `get_by_id` — read-side for GET /v1/tour-plans/{id}.

State transitions are intentionally one-way (queued → ready|rejected); no
retry/back-to-queued path until Phase 3 wires it. Updates use SQL `now()`
on updated_at so the DB clock is the source of truth.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import TourPlanRow


async def insert_queued(
    session: AsyncSession,
    *,
    guest_id: UUID,
    request_payload: dict[str, Any],
    plan_id: UUID | None = None,
) -> TourPlanRow:
    """Insert a `queued` row and return the persisted entity (id assigned)."""
    now = datetime.now(timezone.utc)
    row = TourPlanRow(
        id=plan_id or uuid4(),
        guest_id=guest_id,
        status="queued",
        request_payload=request_payload,
        plan_payload=None,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    await session.flush()
    return row


async def get_by_id(session: AsyncSession, plan_id: UUID) -> TourPlanRow | None:
    stmt = select(TourPlanRow).where(TourPlanRow.id == plan_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def mark_ready(
    session: AsyncSession,
    plan_id: UUID,
    plan_payload: dict[str, Any],
) -> None:
    await _set_terminal(session, plan_id, status="ready", plan_payload=plan_payload)


async def mark_rejected(
    session: AsyncSession,
    plan_id: UUID,
    reason: str,
) -> None:
    await _set_terminal(
        session, plan_id, status="rejected", plan_payload={"error": reason}
    )


async def _set_terminal(
    session: AsyncSession,
    plan_id: UUID,
    *,
    status: str,
    plan_payload: dict[str, Any],
) -> None:
    stmt = (
        update(TourPlanRow)
        .where(TourPlanRow.id == plan_id)
        .values(status=status, plan_payload=plan_payload, updated_at=func.now())
    )
    await session.execute(stmt)


__all__ = ["get_by_id", "insert_queued", "mark_ready", "mark_rejected"]
