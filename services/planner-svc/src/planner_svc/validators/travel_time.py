"""Travel-time validator — haversine estimate + day-budget sanity check."""
from __future__ import annotations

import math

from daily_tour_common import Geom, TourPlan

_WALK_KMH = 5.0
_CAR_KMH = 40.0
_EARTH_RADIUS_KM = 6371.0


class TravelTimeError(ValueError):
    """Raised when cumulative plan time exceeds the available day budget."""


def estimate_minutes(a: Geom, b: Geom, vehicle: bool) -> float:
    """Return haversine travel time in minutes between two points.

    Uses 5 km/h walking or 40 km/h by car (urban Azores v1 approximation).
    """
    lat1, lng1 = math.radians(a.lat), math.radians(a.lng)
    lat2, lng2 = math.radians(b.lat), math.radians(b.lng)
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    km = 2.0 * _EARTH_RADIUS_KM * math.asin(math.sqrt(h))
    speed_kmh = _CAR_KMH if vehicle else _WALK_KMH
    return km / speed_kmh * 60.0


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


__all__ = ["TravelTimeError", "assert_day_fits", "estimate_minutes"]
