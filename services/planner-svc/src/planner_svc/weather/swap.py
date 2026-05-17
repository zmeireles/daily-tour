"""Rainy-slot swap — replace outdoor TourStep place_ids with indoor candidates on wet days."""
from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from daily_tour_common import TourPlan, TourSlot
from daily_tour_common.weather.types import ForecastDay

from ..rag.retriever import RetrievedPlace

RAIN_THRESHOLD: float = 0.6
OUTDOOR_SLOTS: frozenset[TourSlot] = frozenset({TourSlot.MORNING, TourSlot.AFTERNOON})


def swap_rainy_slots(
    plan: TourPlan,
    candidates: Sequence[RetrievedPlace],
    forecast: Sequence[ForecastDay],
) -> TourPlan:
    """Return plan with outdoor steps swapped to indoor candidates when rain prob ≥ 60%.

    ``candidates`` is the pool of indoor-suitable alternatives not yet used in
    the plan. Returns the original plan object unchanged when no forecast entry
    matches the plan date, precipitation is below the threshold, or the
    candidate pool is empty after excluding already-used places.
    """
    day = next((d for d in forecast if d.forecast_date == plan.params.date), None)
    if day is None or day.precip_prob < RAIN_THRESHOLD:
        return plan

    used_ids: set[UUID] = {step.place_id for step in plan.steps}
    indoor_pool = [c for c in candidates if c.place_id not in used_ids]
    if not indoor_pool:
        return plan

    new_steps = list(plan.steps)
    pool_idx = 0
    for i, step in enumerate(new_steps):
        if pool_idx >= len(indoor_pool):
            break
        if step.slot in OUTDOOR_SLOTS:
            new_steps[i] = step.model_copy(update={"place_id": indoor_pool[pool_idx].place_id})
            pool_idx += 1

    return plan.model_copy(update={"steps": new_steps, "weather_aware": True})


__all__ = ["OUTDOOR_SLOTS", "RAIN_THRESHOLD", "swap_rainy_slots"]
