"""Travel-time validator tests — pure math, no network."""
from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from daily_tour_common import Geom, TourPlan, TourPlanStatus, TourSlot
from daily_tour_common.models.tour import TourParams, TourStep

from planner_svc.validators.travel_time import TravelTimeError, assert_day_fits, estimate_minutes

# Ponta Delgada (~37.74°N -25.68°E) → Furnas (~37.77°N -25.46°E): ~19 km apart
_PD = Geom(lat=37.7402, lng=-25.6783)
_FUR = Geom(lat=37.7747, lng=-25.4592)


def test_estimate_minutes_walk_is_slower_than_car():
    walk = estimate_minutes(_PD, _FUR, vehicle=False)
    car = estimate_minutes(_PD, _FUR, vehicle=True)
    assert walk > car


def test_estimate_minutes_car_roughly_correct():
    # ~19 km at 40 km/h → ~28-32 min
    minutes = estimate_minutes(_PD, _FUR, vehicle=True)
    assert 25 < minutes < 40


def test_assert_day_fits_raises_when_over_budget():
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
