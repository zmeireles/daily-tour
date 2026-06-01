"""RabbitMQ consumer skeleton.

Binds the two place-lifecycle queues that the embedding worker (T-2.0.1)
will consume. For T-2.0.0 the handlers are intentionally no-ops that
just log — declaring the topology now lets us verify wiring end-to-end
in the dev Compose stack ahead of the worker landing.

Topology:
  exchange   : `catalog`               (topic, durable)
  bindings   : place.published → queue `search.place.published`
               place.approved → queue `search.place.approved`

Queues are declared `durable=True`. First-deploy auto-creates them; if
catalog-svc declared the exchange with different settings, aio-pika will
raise on connect — that's the desired loud failure, not silent drift.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import aio_pika
from aio_pika.abc import (
    AbstractIncomingMessage,
    AbstractRobustChannel,
    AbstractRobustConnection,
    AbstractRobustQueue,
)

from .config import get_settings

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "catalog"
QUEUE_BINDINGS: tuple[tuple[str, str], ...] = (
    ("search.place.published", "place.published"),
    ("search.place.approved", "place.approved"),
)


@dataclass
class ConsumerHandle:
    connection: AbstractRobustConnection
    channel: AbstractRobustChannel
    queues: list[AbstractRobustQueue]

    async def close(self) -> None:
        await self.channel.close()
        await self.connection.close()


async def _log_message(message: AbstractIncomingMessage) -> None:
    """Skeleton handler — T-2.0.1 replaces this with the embedding pipeline."""
    async with message.process():
        body = message.body.decode("utf-8", errors="replace")
        logger.info(
            "search-svc.mq received",
            extra={"routing_key": message.routing_key, "body_preview": body[:200]},
        )


async def start_consumer(
    *,
    connection_factory: object | None = None,
) -> ConsumerHandle:
    """Connect to RabbitMQ, declare the topology, and start consuming.

    `connection_factory` is injectable for tests — when None, uses
    `aio_pika.connect_robust`. Tests pass a mock so no real broker is hit.
    """
    settings = get_settings()
    connect = connection_factory or aio_pika.connect_robust

    connection: AbstractRobustConnection = await connect(settings.rabbitmq_url)  # type: ignore[operator]
    # connect_robust yields a robust channel at runtime; aio-pika types
    # `.channel()` as the base AbstractChannel, hence the assignment cast.
    channel: AbstractRobustChannel = await connection.channel()  # type: ignore[assignment]
    await channel.set_qos(prefetch_count=4)

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    queues: list[AbstractRobustQueue] = []
    for queue_name, routing_key in QUEUE_BINDINGS:
        queue = await channel.declare_queue(queue_name, durable=True)
        await queue.bind(exchange, routing_key=routing_key)
        await queue.consume(_log_message)
        queues.append(queue)
        logger.info(
            "search-svc.mq queue bound",
            extra={"queue": queue_name, "routing_key": routing_key},
        )

    return ConsumerHandle(connection=connection, channel=channel, queues=queues)


async def run_consumer_forever() -> None:
    """Entrypoint used by `python -m search_svc` to keep the consumer alive."""
    handle = await start_consumer()
    try:
        await asyncio.Future()  # block forever
    finally:
        await handle.close()
