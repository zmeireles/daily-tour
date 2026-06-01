"""Lazily-constructed Redis client for the IPMA forecast cache (slice C).

Mirrors the ``db.py`` lazy-singleton pattern: one module-level
``aioredis.Redis`` built on first use from ``settings.redis_url`` and
reused across messages. The planner consumer is single-process, so a
shared client is correct; ``dispose_redis`` exists for symmetry + tests.

The only consumer is ``daily_tour_common.weather.get_forecast`` (a
read-through cache). ``decode_responses=False`` keeps values as bytes,
which ``json.loads`` accepts.
"""
from __future__ import annotations

import redis.asyncio as aioredis

from .config import get_settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        # redis-py's from_url is untyped in the asyncio namespace.
        _redis = aioredis.from_url(  # type: ignore[no-untyped-call]
            get_settings().redis_url, decode_responses=False
        )
    return _redis


async def dispose_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
    _redis = None


__all__ = ["dispose_redis", "get_redis"]
