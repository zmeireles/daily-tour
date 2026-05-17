"""Travel-time validator tests."""
from __future__ import annotations

from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from daily_tour_common import Geom, TourPlan, TourPlanStatus, TourSlot
from daily_tour_common.models.tour import TourParams, TourStep
from daily_tour_common.osrm import RouteResult

from planner_svc.validators.travel_time import TravelTimeError, assert_day_fits, estimate_minutes

# Ponta Delgada (~37.74°N -25.68°E) → Furnas (~37.77°N -25.46°E): ~19 km apart
_PD = Geom(lat=37.7402, lng=-25.6783)
_FUR = Geom(lat=37.7747, lng=-25.4592)

_no_osrm = patch(
    "planner_svc.validators.travel_time.get_route",
    new_callable=AsyncMock,
    return_value=None,
)


@_no_osrm
async def test_estimate_minutes_walk_is_slower_than_car(_mock: AsyncMock) -> None:
    walk = await estimate_minutes(_PD, _FUR, vehicle=False)
    car = await estimate_minutes(_PD, _FUR, vehicle=True)
    assert walk > car


@_no_osrm
async def test_estimate_minutes_car_roughly_correct(_mock: AsyncMock) -> None:
    # ~19 km at 40 km/h → ~28-32 min
    minutes = await estimate_minutes(_PD, _FUR, vehicle=True)
    assert 25 < minutes < 40


async def test_estimate_minutes_osrm_happy_path() -> None:
    osrm_result = RouteResult(distance_m=20_000.0, duration_s=1_500.0)  # 25 min driving
    with patch(
        "planner_svc.validators.travel_time.get_route",
        new_callable=AsyncMock,
        return_value=osrm_result,
    ):
        minutes = await estimate_minutes(_PD, _FUR, vehicle=True)
    assert minutes == pytest.approx(25.0)


@_no_osrm
async def test_estimate_minutes_osrm_down_falls_back_to_haversine(_mock: AsyncMock) -> None:
    # OSRM returns None → haversine → ~19 km at 40 km/h → 25-40 min
    minutes = await estimate_minutes(_PD, _FUR, vehicle=True)
    assert 25 < minutes < 40


def test_assert_day_fits_raises_when_over_budget() -> None:
    # Two 4-hour steps (240 min each) + 30 min travel = 510 min > 480 min budget
    start = datetime(2024, 8, 1, 9, 0, tzinfo=UTC)
    mid = datetime(2024, 8, 1, 13, 0, tzinfo=UTC)
    end = datetime(2024, 8, 1, 17, 0, tzinfo=UTC)
    pid = uuid4()
    plan = TourPlan(
        id=uuid4(),
        reservation_id=uuid4(),
        params=TourParams(
            date=date(2024, 8, 1),
            start_time="09:00",
            end_time="17:00",
            party_size=2,
            vehicle="none",
        ),
        status=TourPlanStatus.VALIDATING,
        steps=[
            TourStep(slot=TourSlot.MORNING, place_id=pid, start=start, end=mid, rationale="a"),
            TourStep(
                slot=TourSlot.AFTERNOON,
                place_id=pid,
                start=mid,
                end=end,
                rationale="b",
                travel_to_minutes=30,
            ),
        ],
        created_at=start,
    )
    with pytest.raises(TravelTimeError, match="510"):
        assert_day_fits(plan, day_minutes_budget=480)
