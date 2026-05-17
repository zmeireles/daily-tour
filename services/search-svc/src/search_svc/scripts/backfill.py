"""Backfill script — publishes place.published for every active place.

Run once after a fresh dev environment to seed the embeddings worker with
the 28 places already in the catalog. Idempotent: the worker upserts on
place_id, so re-running is harmless.

    uv run backfill
"""
from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import aio_pika
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from ..config import get_settings
from ..models import Place

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "catalog"
ROUTING_KEY = "place.published"


@asynccontextmanager
async def _db_session(database_url: str) -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(database_url, echo=False)
    try:
        async with AsyncSession(engine) as session:
            yield session
    finally:
        await engine.dispose()


async def backfill(
    *,
    session_context: Any | None = None,
    connection_factory: object | None = None,
) -> int:
    """Enqueue place.published for every published place.

    Returns the number of messages published.
    Both injectable params exist for testing — when None, real infrastructure
    is used (DB from settings.database_url, MQ from settings.rabbitmq_url).
    """
    settings = get_settings()

    ctx = session_context if session_context is not None else _db_session(settings.database_url)
    async with ctx as session:
        result = await session.execute(select(Place).where(Place.status == "published"))
        places = list(result.scalars())

    if not places:
        logger.info("backfill: no published places found, nothing to enqueue")
        return 0

    connect = connection_factory or aio_pika.connect_robust
    connection = await connect(settings.rabbitmq_url)  # type: ignore[misc, operator]

    try:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            EXCHANGE_NAME,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        for place in places:
            body = json.dumps(
                {
                    "place_id": str(place.id),
                    "name": place.name,
                    "description": place.description,
                    "address": place.address,
                }
            ).encode()
            await exchange.publish(
                aio_pika.Message(body=body, content_type="application/json"),
                routing_key=ROUTING_KEY,
            )
    finally:
        await connection.close()

    logger.info("backfill: published %d place.published events", len(places))
    return len(places)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(backfill())
