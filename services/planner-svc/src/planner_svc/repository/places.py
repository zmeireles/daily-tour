"""Read-side geo lookups against `catalog.place` (slice C).

The travel-time validator recomputes inter-stop drive times from real
place coordinates; RAG candidates (search-svc /v1/query) carry only
place_id + distance, so we fetch lat/lng here. planner_svc holds SELECT
on `catalog` for exactly this read-only access.
"""
from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from daily_tour_common import Geom
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import PlaceRow


async def get_place_coords(
    session: AsyncSession, place_ids: Sequence[UUID]
) -> dict[UUID, Geom]:
    """Return ``{place_id: Geom}`` for the given ids; missing ids are omitted."""
    if not place_ids:
        return {}
    stmt = select(PlaceRow.id, PlaceRow.geom_lat, PlaceRow.geom_lng).where(
        PlaceRow.id.in_(set(place_ids))
    )
    result = await session.execute(stmt)
    return {
        row.id: Geom(lat=row.geom_lat, lng=row.geom_lng) for row in result.all()
    }


__all__ = ["get_place_coords"]
