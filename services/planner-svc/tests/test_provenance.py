"""Provenance validator tests — no network, no DB."""
from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import pytest
from daily_tour_common import TourPlan, TourPlanStatus, TourSlot
from daily_tour_common.models.tour import TourParams, TourStep

from planner_svc.validators.provenance import ProvenanceError, assert_provenance

_NOW = datetime(2024, 8, 1, 9, 0, tzinfo=UTC)
_LATER = datetime(2024, 8, 1, 11, 0, tzinfo=UTC)
_PID_A = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
_PID_B = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
_PID_UNKNOWN = UUID("cccccccc-cccc-4ccc-8ccc-cccccccccccc")


def _make_plan(place_ids: list[UUID]) -> TourPlan:
    steps = [
        TourStep(slot=TourSlot.MORNING, place_id=pid, start=_NOW, end=_LATER, rationale="test")
        for pid in place_ids
    ]
    return TourPlan(
        id=uuid4(),
        reservation_id=uuid4(),
        params=TourParams(
            date=date(2024, 8, 1),
            start_time="09:00",
            end_time="18:00",
            party_size=2,
            vehicle="none",
        ),
        status=TourPlanStatus.VALIDATING,
        steps=steps,
        created_at=_NOW,
    )


def test_passes_when_all_place_ids_in_candidates():
    plan = _make_plan([_PID_A, _PID_B])
    assert_provenance(plan, {_PID_A, _PID_B})  # must not raise


def test_raises_on_hallucinated_place_id():
    plan = _make_plan([_PID_A, _PID_UNKNOWN])
    with pytest.raises(ProvenanceError, match=str(_PID_UNKNOWN)):
        assert_provenance(plan, {_PID_A, _PID_B})


def test_raises_when_candidate_set_is_empty():
    plan = _make_plan([_PID_A])
    with pytest.raises(ProvenanceError):
        assert_provenance(plan, set())
