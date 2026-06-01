"""HTTP routes for tour plan lifecycle (T-3.1.0).

POST /v1/tour-plans  — create a queued plan row; body supplied by BFF.
GET  /v1/tour-plans/{plan_id} — read plan status + payload; polled by BFF.

The DB session is opened as a context-managed scope per request using
`session_scope()` from db.py — the same pattern health.py follows for
future DB checks, and what the repository tests use for insert/read.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import session_scope
from ..mq import publish_requested
from ..repository.plans import get_by_id, insert_queued

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

    return TourPlanOut(id=row.id, status=row.status, plan_payload=row.plan_payload)


@router.get("/v1/tour-plans/{plan_id}", response_model=TourPlanOut)
async def get_tour_plan(plan_id: UUID) -> TourPlanOut:
    async with session_scope() as session:
        row = await get_by_id(session, plan_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not_found")
    return TourPlanOut(id=row.id, status=row.status, plan_payload=row.plan_payload)
