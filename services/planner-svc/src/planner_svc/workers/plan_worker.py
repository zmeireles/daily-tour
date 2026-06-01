"""Plan worker core — produce + validate a tour plan.

Two entry points:

- ``produce_plan`` (T-3.0.3 slice B) runs the full pipeline from the
  stored ``request_payload`` to a parsed ``TourPlan``: translates the
  BFF body, fans out RAG retrieval, calls the LLM, parses the JSON
  response, and runs the provenance check. The output is a candidate
  ``TourPlan`` and the candidate set it was generated from.
- ``process_plan`` (T-3.0.3 slice C path) runs the validators on an
  already-generated plan: provenance + travel-time + weather-aware
  rainy-slot swap. The orchestrator (``mq._process_plan``) calls
  ``produce_plan`` and may then call ``process_plan`` once IPMA /
  OSRM dependencies are reliable in the deploy env.

The split lets slice B ship the LLM-driven happy path without taking
on weather / drive-time dependencies that have their own
plan-accounting gaps (IPMA forecast cache, OSRM overlay).
"""
from __future__ import annotations

import json
import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

import redis.asyncio as aioredis
from daily_tour_common import TourPlan, TourStep
from daily_tour_common.models.common import Geom
from daily_tour_common.models.enums import TourPlanStatus
from daily_tour_common.models.tour import TourParams
from daily_tour_common.weather import ForecastDay, get_forecast
from pydantic import ValidationError
from redis.exceptions import RedisError

from ..llm import LLMError, generate
from ..prompt.assembler import (
    SYSTEM_PROMPT,
    ActionWish,
    PlanRequest,
    assemble_prompt,
)
from ..rag.retriever import RetrievalError, RetrievedPlace, retrieve
from ..validators.provenance import assert_provenance
from ..validators.travel_time import assert_day_fits
from ..weather.swap import swap_rainy_slots

logger = logging.getLogger(__name__)

_DAY_BUDGET_MINUTES = 540

# São Miguel / Ponta Delgada default for slice B. Real reservation→guesthouse
# geo lookup is gated on the guesthouse association being propagated through
# the BFF/JWT — captured as a slice-B follow-up.
_DEFAULT_LOC = Geom(lat=37.7402, lng=-25.6783)
_DEFAULT_RADIUS_KM = 20.0
_DEFAULT_PARTY_SIZE = 2
_DEFAULT_START_TIME = "09:30"
_RAG_CANDIDATES_PER_ACTION = 8


@dataclass(frozen=True)
class WorkerError(Exception):
    """Categorised failure surfaced into ``planner.tour_plan.plan_payload`` on reject.

    ``reason`` is the short slug that the row carries (``invalid_request``,
    ``rag_unavailable``, ``llm_unavailable``, ``llm_unparseable``,
    ``provenance``); ``detail`` is a short human-readable string for ops.
    """

    reason: str
    detail: str

    def __str__(self) -> str:
        return f"{self.reason}: {self.detail}"


def _coerce_vehicle(raw: object) -> bool:
    """BFF sends ``vehicle: "car" | "bike" | "walking" | "bus"`` — only "car" counts as vehicled."""
    return isinstance(raw, str) and raw.lower() == "car"


def _end_time_from_hours(start: str, hours: int) -> str:
    """Derive end_time from start_time + duration_hours, clamped to 23:30."""
    h, m = (int(p) for p in start.split(":"))
    total = h * 60 + m + hours * 60
    eh, em = divmod(total, 60)
    if eh >= 24:
        return "23:30"
    return f"{eh:02d}:{em:02d}"


def _build_plan_request(payload: dict[str, Any]) -> PlanRequest:
    """Translate the BFF ``request_payload`` shape into the assembler's PlanRequest.

    Raises ``WorkerError(reason="invalid_request")`` on missing/invalid fields.
    The BFF schema (services/bff/src/routes/tour-plans.ts) is:
        wishes: list[str] (1..20), duration_hours: int (1..12),
        vehicle: "car"|"bike"|"walking"|"bus", free_text?: str
    """
    try:
        wishes = payload["wishes"]
        duration_hours = int(payload["duration_hours"])
        vehicle_raw = payload["vehicle"]
    except (KeyError, TypeError, ValueError) as exc:
        raise WorkerError(reason="invalid_request", detail=str(exc)) from exc

    if not isinstance(wishes, list) or not wishes:
        raise WorkerError(reason="invalid_request", detail="wishes must be a non-empty list")

    action_wishes = [ActionWish(action=str(w)) for w in wishes]
    free_text = payload.get("free_text")
    if free_text is not None and not isinstance(free_text, str):
        free_text = None

    try:
        return PlanRequest(
            loc=_DEFAULT_LOC,
            radius_km=_DEFAULT_RADIUS_KM,
            action_wishes=action_wishes,
            start_time=_DEFAULT_START_TIME,
            end_time=_end_time_from_hours(_DEFAULT_START_TIME, duration_hours),
            party_size=_DEFAULT_PARTY_SIZE,
            vehicle=_coerce_vehicle(vehicle_raw),
            free_text=free_text,
        )
    except ValidationError as exc:
        raise WorkerError(reason="invalid_request", detail=str(exc)) from exc


async def _retrieve_candidates(
    plan_request: PlanRequest,
) -> dict[str, list[RetrievedPlace]]:
    """Fan out RAG retrieval across the requested action slugs.

    Raises ``WorkerError(reason="rag_unavailable")`` on the first failure;
    no partial-results path until ops calibration says it's worth it.
    """
    candidates_by_action: dict[str, list[RetrievedPlace]] = {}
    for wish in plan_request.action_wishes:
        try:
            results = await retrieve(
                action=wish.action,
                wish=wish.wish,
                free_text=wish.free_text,
                loc=plan_request.loc,
                km=plan_request.radius_km,
                k=_RAG_CANDIDATES_PER_ACTION,
            )
        except (RetrievalError, OSError) as exc:
            raise WorkerError(reason="rag_unavailable", detail=str(exc)) from exc
        candidates_by_action[wish.action] = results
    return candidates_by_action


async def _call_llm(
    plan_request: PlanRequest,
    candidates_by_action: dict[str, list[RetrievedPlace]],
) -> str:
    """Call the Anthropic Messages API; raises WorkerError on missing key or LLM error.

    Augments SYSTEM_PROMPT with the strict JSON-only output contract so the
    parser can stay simple.
    """
    user_prompt = assemble_prompt(plan_request, candidates_by_action)
    today_iso = date.today().isoformat()
    system = (
        SYSTEM_PROMPT
        + "\n\nReturn ONLY a single JSON object with this exact shape, no markdown,"
        + " no commentary. Datetimes MUST be ISO 8601 with an explicit timezone"
        + f" offset (use Z for UTC). Use today's date ({today_iso}) for all"
        + " start/end values:\n"
        + '{"steps": [{"slot": "morning|lunch|afternoon|dinner|evening|breakfast",'
        + ' "place_id": "<UUID from the candidate list>",'
        + f' "start": "{today_iso}T09:30:00Z", "end": "{today_iso}T11:00:00Z",'
        + ' "rationale": "<one sentence>"}]}'
    )

    # Lazy import + lazy settings so the worker module is importable in
    # tests without the anthropic SDK touching the env.
    from ..config import get_settings

    settings = get_settings()
    try:
        raw = await generate(
            settings=settings,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except LLMError as exc:
        raise WorkerError(reason="llm_error", detail=str(exc)) from exc
    except Exception as exc:
        raise WorkerError(reason="llm_error", detail=str(exc)) from exc

    if raw is None:
        raise WorkerError(
            reason="llm_unavailable",
            detail="anthropic_api_key not configured",
        )
    return raw


def _strip_json_fences(raw: str) -> str:
    """Some models wrap JSON in ```json ... ``` despite instructions — be lenient."""
    stripped = raw.strip()
    if stripped.startswith("```"):
        first_nl = stripped.find("\n")
        if first_nl == -1:
            return stripped
        stripped = stripped[first_nl + 1 :]
        if stripped.endswith("```"):
            stripped = stripped[: -len("```")]
    return stripped.strip()


def _parse_steps(raw: str) -> list[TourStep]:
    """Extract ``steps`` from the LLM's JSON payload and validate each step.

    Raises ``WorkerError(reason="llm_unparseable")`` on any parse / shape /
    schema violation. We accept either a top-level object with a ``steps``
    array or a bare ``steps`` array for liberal compatibility.
    """
    body = _strip_json_fences(raw)
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise WorkerError(
            reason="llm_unparseable", detail=f"not JSON: {exc}"
        ) from exc

    raw_steps: object
    if isinstance(parsed, dict):
        raw_steps = parsed.get("steps")
    elif isinstance(parsed, list):
        raw_steps = parsed
    else:
        raise WorkerError(
            reason="llm_unparseable", detail=f"top-level type: {type(parsed).__name__}"
        )

    if not isinstance(raw_steps, list):
        raise WorkerError(
            reason="llm_unparseable", detail="'steps' is not a list"
        )

    steps: list[TourStep] = []
    for item in raw_steps:
        try:
            steps.append(TourStep.model_validate(item))
        except ValidationError as exc:
            raise WorkerError(
                reason="llm_unparseable", detail=f"step schema: {exc}"
            ) from exc
    return steps


def _build_tour_plan(
    *,
    plan_id: UUID,
    reservation_id: UUID | None,
    plan_request: PlanRequest,
    steps: list[TourStep],
) -> TourPlan:
    """Wrap LLM-produced steps into a full TourPlan with stable defaults.

    ``reservation_id`` is the real reservation reference forwarded from the
    JWT ``rid`` claim via the BFF (#147). It is nullable on the queued row
    (rows created before the column existed, or a caller that omits it), so
    we fall back to ``plan_id`` to keep the TourPlan schema's required
    ``reservation_id`` well-typed.
    """
    now = datetime.now(UTC)
    return TourPlan(
        id=plan_id,
        reservation_id=reservation_id or plan_id,
        params=TourParams(
            date=date.today().isoformat(),
            start_time=plan_request.start_time,
            end_time=plan_request.end_time,
            party_size=plan_request.party_size,
            vehicle="car" if plan_request.vehicle else "none",
        ),
        status=TourPlanStatus.COMPLETED,
        steps=steps,
        created_at=now.isoformat(),
    )


async def produce_plan(
    *,
    plan_id: UUID,
    request_payload: dict[str, Any],
    reservation_id: UUID | None = None,
) -> tuple[TourPlan, list[RetrievedPlace]]:
    """Run the full pipeline: translate → RAG → LLM → parse → provenance.

    Returns the validated ``TourPlan`` and the flat candidate list it was
    generated against (caller may forward to ``process_plan`` for weather
    + travel-time refinement in slice C).

    Raises ``WorkerError`` (categorised) on any step failure. The caller is
    expected to ``mark_rejected`` with the reason + detail. Caller decides
    whether to ack the message (we do; this is not a transient failure
    in slice B — re-running on a broken request would just re-fail).
    """
    plan_request = _build_plan_request(request_payload)

    candidates_by_action = await _retrieve_candidates(plan_request)
    flat_candidates = [c for cs in candidates_by_action.values() for c in cs]
    if not flat_candidates:
        raise WorkerError(
            reason="rag_empty",
            detail="no candidates returned for any requested action",
        )

    raw = await _call_llm(plan_request, candidates_by_action)
    steps = _parse_steps(raw)

    plan = _build_tour_plan(
        plan_id=plan_id,
        reservation_id=reservation_id,
        plan_request=plan_request,
        steps=steps,
    )

    candidate_ids = {c.place_id for c in flat_candidates}
    try:
        assert_provenance(plan, candidate_ids)
    except ValueError as exc:
        # provenance.ProvenanceError subclasses ValueError
        raise WorkerError(reason="provenance", detail=str(exc)) from exc

    return plan, flat_candidates


async def process_plan(
    plan: TourPlan,
    candidates: Sequence[RetrievedPlace],
    redis_client: aioredis.Redis,
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

    # Weather is best-effort: a Redis outage (or IPMA failure, already handled
    # inside get_forecast) must not fail an otherwise-valid plan — no swap, no
    # raise. Only provenance / over-budget above are terminal.
    forecast: list[ForecastDay] = []
    try:
        forecast = await get_forecast(redis_client)
    except RedisError:
        logger.warning("forecast cache unavailable; skipping weather swap")
    return swap_rainy_slots(plan, candidates, forecast)


__all__ = ["WorkerError", "process_plan", "produce_plan"]
