"""Tests for the IPMA forecast client."""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from daily_tour_common.weather.ipma_client import _CACHE_KEY, _CACHE_TTL, get_forecast

_SAMPLE_DAY = {
    "forecastDate": "2025-06-01",
    "tMin": "14.0",
    "tMax": "23.0",
    "precipitaProb": "0.3",
    "predWindDir": "N",
    "classWindSpeed": 2,
    "idWeatherType": 1,
}

_SAMPLE_PAYLOAD = {"data": [_SAMPLE_DAY], "globalIdLocal": 3490100}


def _make_redis(cached_value: bytes | None = None) -> AsyncMock:
    r = AsyncMock()
    r.get = AsyncMock(return_value=cached_value)
    r.setex = AsyncMock()
    return r


class TestCacheHit:
    async def test_returns_cached_forecast_without_http_call(self) -> None:
        cached = json.dumps([_SAMPLE_DAY]).encode()
        redis = _make_redis(cached_value=cached)

        with patch("daily_tour_common.weather.ipma_client.httpx.AsyncClient") as mock_client:
            result = await get_forecast(redis)

        mock_client.assert_not_called()
        assert len(result) == 1
        assert result[0].forecast_date.isoformat() == "2025-06-01"
        assert result[0].t_min == 14.0
        assert result[0].t_max == 23.0
        redis.setex.assert_not_called()


class TestCacheMiss:
    async def test_fetches_from_api_and_caches(self) -> None:
        redis = _make_redis(cached_value=None)

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value=_SAMPLE_PAYLOAD)

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)

        with patch(
            "daily_tour_common.weather.ipma_client.httpx.AsyncClient"
        ) as mock_client_class:
            mock_client_class.return_value.__aenter__ = AsyncMock(
                return_value=mock_client_instance
            )
            mock_client_class.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await get_forecast(redis)

        assert len(result) == 1
        assert result[0].weather_type_id == 1
        redis.setex.assert_awaited_once_with(
            _CACHE_KEY, _CACHE_TTL, json.dumps([_SAMPLE_DAY])
        )


class TestApiErrorFallback:
    async def test_returns_empty_list_on_http_error(self) -> None:
        redis = _make_redis(cached_value=None)

        with patch(
            "daily_tour_common.weather.ipma_client.httpx.AsyncClient"
        ) as mock_client_class:
            mock_client_class.return_value.__aenter__ = AsyncMock(
                side_effect=httpx.ConnectError("timeout")
            )
            mock_client_class.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await get_forecast(redis)

        assert result == []
        redis.setex.assert_not_called()
