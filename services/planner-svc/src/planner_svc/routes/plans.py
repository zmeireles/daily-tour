"""HTTP routes for tour plan lifecycle (T-3.1.0).

POST /v1/tour-plans  — create a queued plan row; body supplied by BFF.
GET  /v1/tour-plans/{plan_id}?guest_id= — the OWNER's read; polled by BFF.
GET  /v1/public/tour-plans/{plan_id} — the world's read of a shared plan.
POST/DELETE /v1/tour-plans/{plan_id}/share — grant/withdraw public
readability (dt-tests #40). Both are guest-scoped; see repository.set_shared.

dt-tests #42 — the two reads are separate routes rather than one route with
an optional `guest_id`, deliberately. An optional scope is applied by whoever
remembers to pass it: the next caller that omits it gets an unscoped read and
nothing fails. Here `guest_id` is REQUIRED, so omitting it is a 422 — the
audience is chosen by which URL you call, and neither default is "everyone".

The DB session is opened as a context-managed scope per request using
`session_scope()` from db.py — the same pattern health.py follows for
future DB checks, and what the repository tests use for insert/read.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..db import session_scope
from ..mq import publish_requested
from ..repository.plans import (
    get_by_id,
    get_owned,
    get_shared,
    insert_queued,
    set_shared,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class CreatePlanRequest(BaseModel):
    guest_id: UUID
    reservation_id: UUID | None = None
    request_payload: dict[str, object]


class TourPlanOut(BaseModel):
    id: UUID
    status: str
    plan_payload: dict[str, object] | None
    # dt-tests #40 — the BFF's public route gates on this. NULL = private.
    shared_at: datetime | None = None


class SharePlanRequest(BaseModel):
    """Owner of the plan, taken from the guest JWT `sub` by the BFF."""

    guest_id: UUID


@router.post("/v1/tour-plans", response_model=TourPlanOut, status_code=201)
async def create_tour_plan(body: CreatePlanRequest) -> TourPlanOut:
    async with session_scope() as session:
        row = await insert_queued(
            session,
            guest_id=body.guest_id,
            reservation_id=body.reservation_id,
            request_payload=body.request_payload,
        )
        await session.commit()

    # Fire-and-log: a publish failure must NOT roll back the queued row
    # (the API has already returned its 202-equivalent contract). The
    # consumer will pick the row up once the queue is healthy again, or
    # the row stays at `queued` and surfaces in the next ops sweep.
    try:
        await publish_requested(row.id)
    except Exception as exc:
        logger.error(
            "planner-svc.routes publish failed; plan stuck at queued",
            extra={"plan_id": str(row.id), "err": str(exc)},
        )

    return TourPlanOut(
        id=row.id, status=row.status, plan_payload=row.plan_payload, shared_at=row.shared_at
    )


@router.get("/v1/tour-plans/{plan_id}", response_model=TourPlanOut)
async def get_tour_plan(
    plan_id: UUID,
    guest_id: Annotated[UUID, Query(description="Owner, from the BFF's JWT `sub`.")],
) -> TourPlanOut:
    """Read a plan on behalf of its owner (dt-tests #42).

    `guest_id` has no default: a caller that forgets it gets a 422, never a
    plan belonging to somebody else. A plan owned by another guest 404s — the
    same answer a missing id gives, so this cannot be used to probe plan ids.
    """
    async with session_scope() as session:
        row = await get_owned(session, plan_id, guest_id=guest_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not_found")
    return TourPlanOut(
        id=row.id, status=row.status, plan_payload=row.plan_payload, shared_at=row.shared_at
    )


@router.get("/v1/public/tour-plans/{plan_id}", response_model=TourPlanOut)
async def get_public_tour_plan(plan_id: UUID) -> TourPlanOut:
    """Read a plan the owner has shared — no guest identity involved.

    The BFF gates on `shared_at` too. This is the second, independent control:
    an unshared plan is unreachable through this route whatever the BFF does.
    """
    async with session_scope() as session:
        row = await get_shared(session, plan_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not_found")
    return TourPlanOut(
        id=row.id, status=row.status, plan_payload=row.plan_payload, shared_at=row.shared_at
    )


async def _set_share(plan_id: UUID, guest_id: UUID, *, shared: bool) -> TourPlanOut:
    async with session_scope() as session:
        changed = await set_shared(session, plan_id, guest_id=guest_id, shared=shared)
        if not changed:
            # Indistinguishable from "no such plan" on purpose — a caller must
            # not be able to learn that a plan id exists but belongs to someone
            # else, nor that it exists but is not ready.
            raise HTTPException(status_code=404, detail="not_found")
        row = await get_by_id(session, plan_id)
        await session.commit()
    assert row is not None  # updated a row above, so it exists
    return TourPlanOut(
        id=row.id, status=row.status, plan_payload=row.plan_payload, shared_at=row.shared_at
    )


@router.post("/v1/tour-plans/{plan_id}/share", response_model=TourPlanOut)
async def share_tour_plan(plan_id: UUID, body: SharePlanRequest) -> TourPlanOut:
    return await _set_share(plan_id, body.guest_id, shared=True)


@router.delete("/v1/tour-plans/{plan_id}/share", response_model=TourPlanOut)
async def unshare_tour_plan(plan_id: UUID, body: SharePlanRequest) -> TourPlanOut:
    return await _set_share(plan_id, body.guest_id, shared=False)
