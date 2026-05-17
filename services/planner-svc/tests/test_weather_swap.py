"""Tests for swap_rainy_slots: no rain / rain swap / no indoor available."""
from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from daily_tour_common import TourPlan, TourPlanStatus, TourSlot
from daily_tour_common.models.tour import TourParams, TourStep
from daily_tour_common.weather.types import ForecastDay

from planner_svc.rag.retriever import RetrievedPlace
from planner_svc.weather.swap import RAIN_THRESHOLD, swap_rainy_slots

_NOW = datetime(2024, 8, 1, 9, 0, tzinfo=UTC)
_LATER = datetime(2024, 8, 1, 11, 0, tzinfo=UTC)
_TOUR_DATE = date(2024, 8, 1)
_PID_A = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
_PID_B = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")


def _make_plan(*slots: TourSlot) -> TourPlan:
    steps = [
        TourStep(slot=s, place_id=_PID_A, start=_NOW, end=_LATER, rationale="r")
        for s in slots
    ]
    return TourPlan(
        id=uuid4(),
        reservation_id=uuid4(),
        params=TourParams(
            date=_TOUR_DATE,
            start_time="09:00",
            end_time="18:00",
            party_size=2,
            vehicle="none",
        ),
        status=TourPlanStatus.VALIDATING,
        steps=steps,
        created_at=_NOW,
    )


def _forecast(precip_prob: float) -> list[ForecastDay]:
    return [
        ForecastDay.model_validate({
            "forecastDate": _TOUR_DATE.isoformat(),
            "tMin": "14.0",
            "tMax": "22.0",
            "precipitaProb": str(precip_prob),
            "idWeatherType": 1,
        })
    ]


def test_no_rain_returns_plan_unchanged() -> None:
    plan = _make_plan(TourSlot.MORNING, TourSlot.AFTERNOON)
    result = swap_rainy_slots(
        plan,
        [RetrievedPlace(place_id=_PID_B, distance_km=1.0, score=0.9)],
        _forecast(RAIN_THRESHOLD - 0.01),
    )
    assert result is plan
    assert result.weather_aware is False


def test_rain_swaps_outdoor_steps() -> None:
    plan = _make_plan(TourSlot.BREAKFAST, TourSlot.MORNING, TourSlot.AFTERNOON)
    indoor = RetrievedPlace(place_id=_PID_B, distance_km=0.5, score=0.95)
    result = swap_rainy_slots(plan, [indoor], _forecast(0.8))

    assert result is not plan
    assert result.weather_aware is True
    assert result.steps[0].place_id == _PID_A  # breakfast untouched
    assert result.steps[1].place_id == _PID_B  # morning swapped
    assert result.steps[2].place_id == _PID_A  # no candidate left — afternoon stays


def test_no_indoor_available_returns_plan_unchanged() -> None:
    plan = _make_plan(TourSlot.MORNING)
    result = swap_rainy_slots(plan, [], _forecast(0.9))
    assert result is plan
