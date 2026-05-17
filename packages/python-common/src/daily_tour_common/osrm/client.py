import logging
from typing import Any

import httpx

from .types import RouteResult

_DEFAULT_BASE_URL = "http://dt_osrm:5000"

logger = logging.getLogger(__name__)


async def get_route(
    lon_a: float,
    lat_a: float,
    lon_b: float,
    lat_b: float,
    *,
    base_url: str = _DEFAULT_BASE_URL,
) -> RouteResult | None:
    url = f"{base_url}/route/v1/driving/{lon_a},{lat_a};{lon_b},{lat_b}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params={"overview": "false"})
            resp.raise_for_status()
            payload: dict[str, Any] = resp.json()
    except Exception:
        logger.exception("OSRM route request failed")
        return None

    if payload.get("code") != "Ok":
        logger.warning("OSRM returned non-Ok code: %s", payload.get("code"))
        return None

    routes: list[dict[str, Any]] = payload.get("routes", [])
    if not routes:
        return None

    route = routes[0]
    return RouteResult(
        distance_m=route["distance"],
        duration_s=route["duration"],
    )


__all__ = ["get_route"]
