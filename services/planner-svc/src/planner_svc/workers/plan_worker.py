"""Plan worker core — validate and weather-swap a generated TourPlan.

T-3.0.3 adds the full RabbitMQ message loop; this module contains the
per-message processing logic: provenance → travel-time → rainy-slot swap.
"""
from __future__ import annotations

import logging
from collections.abc import Sequence
from uuid import UUID

import redis.asyncio as aioredis
from daily_tour_common import TourPlan
from daily_tour_common.weather import get_forecast

from ..rag.retriever import RetrievedPlace
from ..validators.provenance import assert_provenance
from ..validators.travel_time import assert_day_fits
from ..weather.swap import swap_rainy_slots

logger = logging.getLogger(__name__)

_DAY_BUDGET_MINUTES = 540


async def process_plan(
    plan: TourPlan,
    candidates: Sequence[RetrievedPlace],
    redis_client: aioredis.Redis,  # type: ignore[type-arg]
    *,
    day_budget_minutes: int = _DAY_BUDGET_MINUTES,
) -> TourPlan:
    """Validate plan then apply weather-aware outdoor-slot swap.

    Raises ProvenanceError if any step.place_id was not in the RAG candidate set.
    Raises TravelTimeError if total durations exceed the day budget.
    Returns the (possibly modified) plan; ``weather_aware`` is True when a swap occurred.
    """
    candidate_ids: set[UUID] = {c.place_id for c in candidates}
    assert_provenance(plan, candidate_ids)
    assert_day_fits(plan, day_budget_minutes)

    forecast = await get_forecast(redis_client)
    return swap_rainy_slots(plan, candidates, forecast)


__all__ = ["process_plan"]
