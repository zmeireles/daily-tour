"""Chaos drill: IPMA endpoint unreachable — forecast falls back to empty list, plan unchanged.

Run from the planner-svc virtualenv:
    cd services/planner-svc
    uv run pytest ../../tests/chaos/scenarios/ipma-down.test.py -v
"""
from __future__ import annotations

import json
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import httpx
import pytest

from daily_tour_common import TourPlan, TourPlanStatus, TourSlot
from daily_tour_common.models.tour import TourParams, TourStep
from daily_tour_common.weather.ipma_client import _CACHE_KEY, get_forecast
from planner_svc.weather.swap import swap_rainy_slots


def _make_redis(cached: bytes | None = None) -> AsyncMock:
    r: AsyncMock = AsyncMock()
    r.get = AsyncMock(return_value=cached)
    r.setex = AsyncMock()
    return r


def _make_plan(plan_date: date = date(2025, 8, 1)) -> TourPlan:
    pid = uuid4()
    start = datetime(2025, 8, 1, 9, 0, tzinfo=UTC)
    mid = datetime(2025, 8, 1, 13, 0, tzinfo=UTC)
    return TourPlan(
        id=uuid4(),
        reservation_id=uuid4(),
        params=TourParams(
            date=plan_date,
            start_time="09:00",
            end_time="17:00",
            party_size=2,
            vehicle="none",
        ),
        status=TourPlanStatus.VALIDATING,
        steps=[
            TourStep(slot=TourSlot.MORNING, place_id=pid, start=start, end=mid, rationale="a"),
        ],
        created_at=start,
    )


_SAMPLE_DAY = {
    "forecastDate": "2025-08-01",
    "tMin": "18.0",
    "tMax": "27.0",
    "precipitaProb": "0.2",
    "predWindDir": "N",
    "classWindSpeed": 1,
    "idWeatherType": 2,
}


class TestIpmaDown:
    """IPMA HTTP endpoint unreachable or returning error — cache-miss path."""

    async def test_get_forecast_returns_empty_list_on_503(self) -> None:
        redis = _make_redis(cached=None)
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "503 Service Unavailable",
            request=MagicMock(),
            response=MagicMock(status_code=503),
        )
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)

        with patch("daily_tour_common.weather.ipma_client.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await get_forecast(redis)

        assert result == []
        redis.setex.assert_not_called()

    async def test_get_forecast_returns_empty_list_on_connect_error(self) -> None:
        redis = _make_redis(cached=None)

        with patch("daily_tour_common.weather.ipma_client.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(
                side_effect=httpx.ConnectError("getaddrinfo failed")
            )
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await get_forecast(redis)

        assert result == []
        redis.setex.assert_not_called()

    async def test_empty_forecast_leaves_plan_unchanged(self) -> None:
        """swap_rainy_slots with empty forecast returns the original plan object unchanged."""
        plan = _make_plan()
        result = swap_rainy_slots(plan, [], [])

        assert result is plan
        assert result.weather_aware is False

    async def test_process_plan_survives_ipma_down(self) -> None:
        """With IPMA down and cache empty, process_plan completes without raising."""
        from planner_svc.validators.provenance import assert_provenance
        from planner_svc.validators.travel_time import assert_day_fits

        plan = _make_plan()
        redis = _make_redis(cached=None)

        with patch("daily_tour_common.weather.ipma_client.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(
                side_effect=httpx.ConnectError("host unreachable")
            )
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            forecast = await get_forecast(redis)

        result = swap_rainy_slots(plan, [], forecast)
        assert result is plan
        assert result.weather_aware is False


class TestIpmaCacheHit:
    """Even with IPMA unreachable, a warm Redis cache serves the forecast without any HTTP call."""

    async def test_cache_hit_bypasses_ipma_entirely(self) -> None:
        cached = json.dumps([_SAMPLE_DAY]).encode()
        redis = _make_redis(cached=cached)

        with patch("daily_tour_common.weather.ipma_client.httpx.AsyncClient") as mock_cls:
            result = await get_forecast(redis)

        mock_cls.assert_not_called()
        assert len(result) == 1
        assert result[0].forecast_date.isoformat() == "2025-08-01"
        assert result[0].precip_prob == pytest.approx(0.2)

    async def test_cache_hit_with_ipma_down_returns_full_forecast(self) -> None:
        """Cache hit takes the fast path regardless of IPMA availability."""
        cached = json.dumps([_SAMPLE_DAY]).encode()
        redis = _make_redis(cached=cached)

        with patch("daily_tour_common.weather.ipma_client.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(
                side_effect=httpx.ConnectError("simulated outage")
            )
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await get_forecast(redis)

        # HTTP client was never entered because Redis hit short-circuited
        mock_cls.return_value.__aenter__.assert_not_called()
        assert len(result) == 1
