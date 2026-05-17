"""Tests for the OSRM route client."""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from daily_tour_common.osrm.client import get_route

_SAMPLE_RESPONSE = {
    "code": "Ok",
    "routes": [{"distance": 12345.6, "duration": 678.9, "legs": []}],
    "waypoints": [],
}


class TestRouteOk:
    async def test_returns_route_result_on_success(self) -> None:
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value=_SAMPLE_RESPONSE)

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("daily_tour_common.osrm.client.httpx.AsyncClient") as mock_class:
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await get_route(-25.6736, 37.7412, -25.6612, 37.7489)

        assert result is not None
        assert result.distance_m == 12345.6
        assert result.duration_s == 678.9


class TestRouteFailure:
    async def test_returns_none_on_http_error(self) -> None:
        with patch("daily_tour_common.osrm.client.httpx.AsyncClient") as mock_class:
            mock_class.return_value.__aenter__ = AsyncMock(
                side_effect=httpx.ConnectError("refused")
            )
            mock_class.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await get_route(-25.6736, 37.7412, -25.6612, 37.7489)

        assert result is None
