"""HTTP routes for tour plan lifecycle (T-3.1.0).

POST /v1/tour-plans  — create a queued plan row; body supplied by BFF.
GET  /v1/tour-plans/{plan_id} — read plan status + payload; polled by BFF.

The DB session is opened as a context-managed scope per request using
`session_scope()` from db.py — the same pattern health.py follows for
future DB checks, and what the repository tests use for insert/read.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import session_scope
from ..repository.plans import get_by_id, insert_queued

router = APIRouter()


class CreatePlanRequest(BaseModel):
    guest_id: UUID
    request_payload: dict


class TourPlanOut(BaseModel):
    id: UUID
    status: str
    plan_payload: dict | None


@router.post("/v1/tour-plans", response_model=TourPlanOut, status_code=201)
async def create_tour_plan(body: CreatePlanRequest) -> TourPlanOut:
    async with session_scope() as session:
        row = await insert_queued(
            session,
            guest_id=body.guest_id,
            request_payload=body.request_payload,
        )
        await session.commit()
        return TourPlanOut(id=row.id, status=row.status, plan_payload=row.plan_payload)


@router.get("/v1/tour-plans/{plan_id}", response_model=TourPlanOut)
async def get_tour_plan(plan_id: UUID) -> TourPlanOut:
    async with session_scope() as session:
        row = await get_by_id(session, plan_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not_found")
    return TourPlanOut(id=row.id, status=row.status, plan_payload=row.plan_payload)
