"""Tests for Pydantic v2 model mirrors of zod schemas from @daily-tour/shared-types."""
import uuid
from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from daily_tour_common.models.action import Action, Wish
from daily_tour_common.models.place import Place, PlaceCandidate
from daily_tour_common.models.tour import TourPlan, TourStep

NOW = datetime.now(tz=UTC).isoformat()
ID = str(uuid.uuid4())
ID2 = str(uuid.uuid4())


PLACE_FIXTURE = {
    "id": ID,
    "guesthouse_scope": "all",
    "name": {"en": "Lagoa das Sete Cidades"},
    "description": {"en": "A stunning crater lake."},
    "geom": {"lat": 37.87, "lng": -25.78},
    "address": "Sete Cidades, São Miguel",
    "contacts": {"phone": "+351912345678", "social": []},
    "hours": [{"dow": 1, "open": "09:00", "close": "18:00"}],
    "actions": [ID2],
    "wishes": [],
    "media": [],
    "status": "published",
    "is_hosts_pick": True,
    "source": {"kind": "manual"},
    "created_at": NOW,
    "updated_at": NOW,
}

PLACE_CANDIDATE_FIXTURE = {
    "id": ID,
    "source": "manual",
    "source_ref": "ref-001",
    "raw": {"foo": "bar"},
    "dedupe_hash": "abc123",
    "status": "new",
    "created_at": NOW,
}

ACTION_FIXTURE = {
    "id": ID,
    "slug": "eat",
    "i18n": {"en": "Eat"},
    "sort_order": 0,
    "icon": "fork",
}

WISH_FIXTURE = {
    "id": ID,
    "action_id": ID2,
    "slug": "eat-fish",
    "i18n": {"en": "Eat fish"},
    "sort_order": 1,
}

TOUR_STEP_FIXTURE = {
    "slot": "lunch",
    "place_id": ID,
    "start": NOW,
    "end": NOW,
    "rationale": "Great views",
    "travel_to_minutes": 15,
    "locked": False,
}

TOUR_PLAN_FIXTURE = {
    "id": ID,
    "reservation_id": ID2,
    "params": {
        "date": "2026-06-01",
        "start_time": "09:00",
        "end_time": "18:00",
        "party_size": 2,
        "vehicle": "car",
    },
    "status": "pending",
    "steps": [TOUR_STEP_FIXTURE],
    "weather_aware": False,
    "created_at": NOW,
}


class TestPlace:
    def test_happy_path(self) -> None:
        place = Place.model_validate(PLACE_FIXTURE)
        assert place.status.value == "published"
        assert place.name == {"en": "Lagoa das Sete Cidades"}  # type: ignore[comparison-overlap]

    def test_rejects_missing_actions(self) -> None:
        bad = {**PLACE_FIXTURE, "actions": []}
        with pytest.raises(ValidationError) as exc_info:
            Place.model_validate(bad)
        errors = exc_info.value.errors()
        assert any(e["loc"][-1] == "actions" for e in errors)

    def test_round_trip(self) -> None:
        place = Place.model_validate(PLACE_FIXTURE)
        dumped = place.model_dump(mode="json", by_alias=True)
        restored = Place.model_validate(dumped)
        assert restored.id == place.id


class TestPlaceCandidate:
    def test_happy_path(self) -> None:
        candidate = PlaceCandidate.model_validate(PLACE_CANDIDATE_FIXTURE)
        assert candidate.status == "new"

    def test_rejects_invalid_status(self) -> None:
        bad = {**PLACE_CANDIDATE_FIXTURE, "status": "unknown"}
        with pytest.raises(ValidationError) as exc_info:
            PlaceCandidate.model_validate(bad)
        errors = exc_info.value.errors()
        assert any(e["loc"][-1] == "status" for e in errors)

    def test_round_trip(self) -> None:
        candidate = PlaceCandidate.model_validate(PLACE_CANDIDATE_FIXTURE)
        dumped = candidate.model_dump(mode="json", by_alias=True)
        restored = PlaceCandidate.model_validate(dumped)
        assert restored.id == candidate.id


class TestAction:
    def test_happy_path(self) -> None:
        action = Action.model_validate(ACTION_FIXTURE)
        assert action.slug == "eat"

    def test_rejects_empty_i18n(self) -> None:
        bad = {**ACTION_FIXTURE, "i18n": {}}
        with pytest.raises(ValidationError) as exc_info:
            Action.model_validate(bad)
        errors = exc_info.value.errors()
        assert any(e["loc"][-1] == "i18n" for e in errors)

    def test_round_trip(self) -> None:
        action = Action.model_validate(ACTION_FIXTURE)
        dumped = action.model_dump(mode="json", by_alias=True)
        restored = Action.model_validate(dumped)
        assert restored.id == action.id


class TestWish:
    def test_happy_path(self) -> None:
        wish = Wish.model_validate(WISH_FIXTURE)
        assert wish.sort_order == 1

    def test_rejects_negative_sort_order(self) -> None:
        bad = {**WISH_FIXTURE, "sort_order": -1}
        with pytest.raises(ValidationError) as exc_info:
            Wish.model_validate(bad)
        errors = exc_info.value.errors()
        assert any(e["loc"][-1] == "sort_order" for e in errors)

    def test_round_trip(self) -> None:
        wish = Wish.model_validate(WISH_FIXTURE)
        dumped = wish.model_dump(mode="json", by_alias=True)
        restored = Wish.model_validate(dumped)
        assert restored.id == wish.id


class TestTourStep:
    def test_happy_path(self) -> None:
        step = TourStep.model_validate(TOUR_STEP_FIXTURE)
        assert step.slot.value == "lunch"

    def test_rejects_negative_travel_time(self) -> None:
        bad = {**TOUR_STEP_FIXTURE, "travel_to_minutes": -1}
        with pytest.raises(ValidationError) as exc_info:
            TourStep.model_validate(bad)
        errors = exc_info.value.errors()
        assert any(e["loc"][-1] == "travel_to_minutes" for e in errors)

    def test_round_trip(self) -> None:
        step = TourStep.model_validate(TOUR_STEP_FIXTURE)
        dumped = step.model_dump(mode="json", by_alias=True)
        restored = TourStep.model_validate(dumped)
        assert restored.place_id == step.place_id


class TestTourPlan:
    def test_happy_path(self) -> None:
        plan = TourPlan.model_validate(TOUR_PLAN_FIXTURE)
        assert plan.status.value == "pending"
        assert len(plan.steps) == 1

    def test_rejects_invalid_vehicle(self) -> None:
        bad = {
            **TOUR_PLAN_FIXTURE,
            "params": {**TOUR_PLAN_FIXTURE["params"], "vehicle": "bicycle"},
        }
        with pytest.raises(ValidationError) as exc_info:
            TourPlan.model_validate(bad)
        errors = exc_info.value.errors()
        assert any(e["loc"][-1] == "vehicle" for e in errors)

    def test_round_trip(self) -> None:
        plan = TourPlan.model_validate(TOUR_PLAN_FIXTURE)
        dumped = plan.model_dump(mode="json", by_alias=True)
        restored = TourPlan.model_validate(dumped)
        assert restored.id == plan.id
