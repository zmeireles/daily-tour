"""Unit tests for plan_worker payload translation (pure, no network)."""
from __future__ import annotations

import pytest

from planner_svc.workers.plan_worker import WorkerError, _build_plan_request


def _payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {"wishes": ["eat"], "duration_hours": 4, "vehicle": "car"}
    base.update(overrides)
    return base


def test_build_plan_request_forwards_locale() -> None:
    req = _build_plan_request(_payload(locale="pt-PT"))
    assert req.locale == "pt-PT"


def test_build_plan_request_defaults_locale_to_en_when_absent() -> None:
    req = _build_plan_request(_payload())
    assert req.locale == "en"


def test_build_plan_request_ignores_non_string_locale() -> None:
    # A malformed claim (e.g. null/number) must not crash; fall back to en.
    req = _build_plan_request(_payload(locale=123))
    assert req.locale == "en"


def test_build_plan_request_rejects_empty_wishes() -> None:
    with pytest.raises(WorkerError, match="invalid_request"):
        _build_plan_request(_payload(wishes=[]))
