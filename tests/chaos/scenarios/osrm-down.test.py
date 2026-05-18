"""Chaos drill: OSRM container unreachable — planner falls back to haversine.

Run from the planner-svc virtualenv:
    cd services/planner-svc
    uv run pytest ../../tests/chaos/scenarios/osrm-down.test.py -v
"""
from __future__ import annotations

import logging

import pytest

from daily_tour_common import Geom
from planner_svc.config import reset_settings_cache
from planner_svc.validators.travel_time import estimate_minutes

# Ponta Delgada (~37.74°N -25.68°E) → Furnas (~37.77°N -25.46°E): ~19 km
_PD = Geom(lat=37.7402, lng=-25.6783)
_FUR = Geom(lat=37.7747, lng=-25.4592)


@pytest.fixture(autouse=True)
def _osrm_dead(monkeypatch: pytest.MonkeyPatch) -> None:
    """Point OSRM_URL at a port with no listener — httpx gets ECONNREFUSED immediately."""
    monkeypatch.setenv("OSRM_URL", "http://127.0.0.1:1")
    reset_settings_cache()
    yield  # type: ignore[misc]
    reset_settings_cache()


async def test_osrm_connection_refused_falls_back_to_haversine(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """OSRM unreachable (connection refused) → estimate_minutes returns haversine estimate."""
    with caplog.at_level(logging.WARNING, logger="planner_svc.validators.travel_time"):
        minutes = await estimate_minutes(_PD, _FUR, vehicle=True)

    # ~19 km at 40 km/h → ~28-32 min; allow generous range for CI variance
    assert 25 < minutes < 40, f"haversine estimate out of expected range: {minutes:.1f} min"
    assert any("haversine" in r.message for r in caplog.records), (
        "expected a WARNING log mentioning 'haversine' when OSRM is unreachable"
    )


async def test_osrm_down_vehicle_false_is_unaffected() -> None:
    """Walking routes always use haversine — OSRM availability is irrelevant."""
    minutes = await estimate_minutes(_PD, _FUR, vehicle=False)
    # ~19 km at 5 km/h → ~228 min
    assert minutes > 200, f"walking estimate unexpectedly short: {minutes:.1f} min"


async def test_osrm_down_estimate_is_deterministic() -> None:
    """Two calls with the same inputs return the same haversine value."""
    a = await estimate_minutes(_PD, _FUR, vehicle=True)
    b = await estimate_minutes(_PD, _FUR, vehicle=True)
    assert a == b
