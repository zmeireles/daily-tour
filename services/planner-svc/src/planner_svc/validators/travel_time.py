"""Travel-time validator — OSRM-first estimate + haversine fallback + day-budget check."""
from __future__ import annotations

import logging
import math
from uuid import UUID

from daily_tour_common import Geom, TourPlan
from daily_tour_common.osrm import get_route

from ..config import get_settings

_WALK_KMH = 5.0
_CAR_KMH = 40.0
_EARTH_RADIUS_KM = 6371.0

logger = logging.getLogger(__name__)


class TravelTimeError(ValueError):
    """Raised when cumulative plan time exceeds the available day budget."""


def _haversine_minutes(a: Geom, b: Geom, vehicle: bool) -> float:
    lat1, lng1 = math.radians(a.lat), math.radians(a.lng)
    lat2, lng2 = math.radians(b.lat), math.radians(b.lng)
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    km = 2.0 * _EARTH_RADIUS_KM * math.asin(math.sqrt(h))
    speed_kmh = _CAR_KMH if vehicle else _WALK_KMH
    return km / speed_kmh * 60.0


async def estimate_minutes(a: Geom, b: Geom, vehicle: bool) -> float:
    """Return travel time in minutes between two points.

    For vehicle trips, tries OSRM first and falls back to haversine on error or
    timeout. Walking always uses haversine (OSRM instance is driving-only).
    """
    if vehicle:
        settings = get_settings()
        result = await get_route(a.lng, a.lat, b.lng, b.lat, base_url=settings.osrm_url)
        if result is not None:
            return float(result.duration_s) / 60.0
        logger.warning("OSRM unavailable — falling back to haversine for vehicle route")
    return _haversine_minutes(a, b, vehicle)


async def annotate_travel_times(
    plan: TourPlan,
    coords: dict[UUID, Geom],
    *,
    vehicle: bool,
) -> TourPlan:
    """Recompute each step's ``travel_to_minutes`` as drive time from the prior stop.

    Replaces the LLM's guess (the prompt doesn't ask for travel times, so they
    arrive as ``None``) with an OSRM/haversine estimate between consecutive
    stops via ``estimate_minutes``. The first step is left unset: it would be
    travel from the guesthouse, whose geo is still a placeholder default in the
    worker, so anchoring to it would be fake precision. A step whose place_id is
    absent from ``coords`` (or whose predecessor is) keeps ``None``.

    Returns a copy with updated steps; the input plan is not mutated.
    """
    steps = list(plan.steps)
    for i in range(1, len(steps)):
        a = coords.get(steps[i - 1].place_id)
        b = coords.get(steps[i].place_id)
        if a is None or b is None:
            continue
        minutes = await estimate_minutes(a, b, vehicle)
        steps[i] = steps[i].model_copy(update={"travel_to_minutes": round(minutes)})
    return plan.model_copy(update={"steps": steps})


def assert_day_fits(plan: TourPlan, day_minutes_budget: int) -> None:
    """Raise TravelTimeError if total step durations + travel times exceed budget.

    Step durations come from TourStep.start/end; travel from travel_to_minutes
    (None → 0). Callers should populate travel_to_minutes via estimate_minutes
    before calling this validator.
    """
    total = 0.0
    for step in plan.steps:
        duration = (step.end - step.start).total_seconds() / 60.0
        travel = float(step.travel_to_minutes) if step.travel_to_minutes is not None else 0.0
        total += duration + travel
    if total > day_minutes_budget:
        raise TravelTimeError(
            f"plan requires ~{total:.0f} min but day budget is {day_minutes_budget} min"
        )


__all__ = [
    "TravelTimeError",
    "annotate_travel_times",
    "assert_day_fits",
    "estimate_minutes",
]
