import json
import logging
from typing import Any

import httpx
import redis.asyncio as aioredis

from .types import ForecastDay

_IPMA_URL = (
    "https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/3490100.json"
)
_CACHE_KEY = "ipma:forecast:3490100"
_CACHE_TTL = 30 * 60  # 30 minutes

logger = logging.getLogger(__name__)


async def get_forecast(redis: aioredis.Redis) -> list[ForecastDay]:
    cached = await redis.get(_CACHE_KEY)
    if cached is not None:
        data: list[dict[str, Any]] = json.loads(cached)
        return [ForecastDay.model_validate(d) for d in data]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(_IPMA_URL)
            resp.raise_for_status()
            payload: dict[str, Any] = resp.json()
    except Exception:
        logger.exception("IPMA fetch failed; returning empty forecast")
        return []

    days_raw: list[dict[str, Any]] = payload.get("data", [])
    await redis.setex(_CACHE_KEY, _CACHE_TTL, json.dumps(days_raw))
    return [ForecastDay.model_validate(d) for d in days_raw]


__all__ = ["get_forecast"]
