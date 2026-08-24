"""CRUD + state transitions for planner.tour_plan (T-3.0.3).

Three operations cover the async flow:

- `insert_queued` — POST /v1/tour-plans handler creates a row in `queued`
  with the inbound payload, before publishing tour-plan.requested.
- `mark_ready` / `mark_rejected` — terminal transitions written by the
  worker once the LLM + validators finish. `mark_rejected` stores an
  `{error: "…"}` JSON payload so the GET endpoint can surface the reason
  without a separate column.
- `get_by_id` — read-side for GET /v1/tour-plans/{id}.
- `set_shared` — dt-tests #40. Grants or withdraws public readability by
  writing/clearing `shared_at`. Scoped by guest_id in the WHERE clause so a
  caller can only ever change a plan it owns, independent of what the BFF
  checked first.

State transitions are intentionally one-way (queued → ready|rejected); no
retry/back-to-queued path until Phase 3 wires it. Updates use SQL `now()`
on updated_at so the DB clock is the source of truth.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import TourPlanRow


async def insert_queued(
    session: AsyncSession,
    *,
    guest_id: UUID,
    request_payload: dict[str, Any],
    reservation_id: UUID | None = None,
    plan_id: UUID | None = None,
) -> TourPlanRow:
    """Insert a `queued` row and return the persisted entity (id assigned)."""
    now = datetime.now(UTC)
    row = TourPlanRow(
        id=plan_id or uuid4(),
        guest_id=guest_id,
        reservation_id=reservation_id,
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


async def set_shared(
    session: AsyncSession,
    plan_id: UUID,
    *,
    guest_id: UUID,
    shared: bool,
) -> bool:
    """Grant or withdraw public readability. Returns False when nothing matched.

    `guest_id` is part of the WHERE clause rather than a precondition checked
    beforehand: a read-then-write would let a plan change hands between the two
    statements, and it would make this function depend on every caller
    remembering the check. A wrong guest updates zero rows and gets False,
    which the route turns into a 404 — the same answer a missing plan gives, so
    the endpoint cannot be used to probe which plan ids exist.

    Only a `ready` plan can be shared; there is nothing to show otherwise. The
    guard is omitted on UNSHARE so a guest can always withdraw a link, whatever
    state the plan has drifted into.
    """
    stmt = (
        update(TourPlanRow)
        .where(TourPlanRow.id == plan_id, TourPlanRow.guest_id == guest_id)
        .values(shared_at=func.now() if shared else None, updated_at=func.now())
    )
    if shared:
        stmt = stmt.where(TourPlanRow.status == "ready")
    # session.execute() is typed as Result, which does not declare rowcount;
    # an UPDATE always yields a CursorResult, which does. Cast rather than
    # ignore, so a future change of statement type fails the typecheck.
    result = cast("CursorResult[Any]", await session.execute(stmt))
    return result.rowcount > 0


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


__all__ = ["get_by_id", "insert_queued", "mark_ready", "mark_rejected", "set_shared"]
