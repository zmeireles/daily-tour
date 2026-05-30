"""RabbitMQ publisher + consumer for tour-plan lifecycle (T-3.0.3 — slice A).

Topology:
    exchange   : `planner`                       (topic, durable)
    routing key: `tour-plan.requested`           (api → worker)
    queue      : `planner.tour-plan.requested`   (durable)

This slice (143.A) wires the transport end-to-end with a **stub handler**
that marks every queued plan as ``ready`` with a placeholder payload. The
real LLM + RAG + validator pipeline is 143.B and will replace
``_process_stub`` with a real call into ``workers.plan_worker.process_plan``.

The split is deliberate: T-3.0.3 was originally claimed complete in PR
#72 but only delivered the API endpoint. This module restores end-to-end
status transitions (UAT-G07 stops polling at `queued` forever), and the
real LLM call is a separate change that we want to be able to revert
without losing the transport wiring.
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import cast
from uuid import UUID

import aio_pika
from aio_pika.abc import (
    AbstractIncomingMessage,
    AbstractRobustChannel,
    AbstractRobustConnection,
    AbstractRobustQueue,
    DeliveryMode,
)

from .config import get_settings
from .db import session_scope
from .repository.plans import mark_ready

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "planner"
REQUESTED_KEY = "tour-plan.requested"
REQUESTED_QUEUE = "planner.tour-plan.requested"


@dataclass
class ConsumerHandle:
    connection: AbstractRobustConnection
    channel: AbstractRobustChannel
    queue: AbstractRobustQueue

    async def close(self) -> None:
        await self.channel.close()
        await self.connection.close()


async def publish_requested(plan_id: UUID) -> None:
    """Publish a ``tour-plan.requested`` message announcing a new queued plan.

    Opens a fresh connection per publish. For the v1 expected throughput
    (a few requests per minute in dev, low double digits/min in beta) the
    setup cost is negligible. If that changes, switch to a long-lived
    publisher connection held by the FastAPI app lifespan.
    """
    settings = get_settings()
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    try:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            EXCHANGE_NAME,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        body = json.dumps({"plan_id": str(plan_id)}).encode("utf-8")
        message = aio_pika.Message(
            body=body,
            content_type="application/json",
            delivery_mode=DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=REQUESTED_KEY)
        logger.info(
            "planner-svc.mq published",
            extra={"plan_id": str(plan_id), "routing_key": REQUESTED_KEY},
        )
    finally:
        await connection.close()


async def _process_stub(plan_id: UUID) -> None:
    """Slice-A stub: mark the plan ready with a placeholder payload.

    Replaced by the real LLM + RAG + validator pipeline in 143.B. Tests
    against this stub verify only that the transport landed: queued row
    becomes ready, GET endpoint returns ready, polling stops.
    """
    async with session_scope() as session:
        await mark_ready(
            session,
            plan_id,
            {
                "stub": True,
                "note": "transport-only handler (143.A); LLM pipeline pending",
                "steps": [],
            },
        )
        await session.commit()
    logger.info(
        "planner-svc.mq marked ready (stub)",
        extra={"plan_id": str(plan_id)},
    )


async def _handle_requested(message: AbstractIncomingMessage) -> None:
    """Consumer handler — parses the message and dispatches to the processor.

    We **don't** ack until processing succeeds (default ``message.process()``
    semantics): if ``_process_stub`` raises, the message goes back into the
    queue. For the stub that's fine; for 143.B the LLM call needs explicit
    timeout + retry-count handling so we don't poison-pill the queue.
    """
    async with message.process(requeue=False):
        try:
            payload = json.loads(message.body.decode("utf-8"))
            plan_id = UUID(payload["plan_id"])
        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.error(
                "planner-svc.mq malformed message; dropping",
                extra={"err": str(exc), "body_preview": message.body[:200]},
            )
            return
        await _process_stub(plan_id)


async def start_consumer(
    *,
    connection_factory: object | None = None,
) -> ConsumerHandle:
    """Connect to RabbitMQ, declare topology, and start consuming.

    ``connection_factory`` is injectable for tests — when None, uses
    ``aio_pika.connect_robust``. Tests pass a mock to keep the wiring
    coverage hermetic.
    """
    settings = get_settings()
    connect = connection_factory or aio_pika.connect_robust

    connection: AbstractRobustConnection = await connect(settings.rabbitmq_url)  # type: ignore[operator]
    # aio-pika types channel() as AbstractChannel; at runtime against a robust
    # connection it's an AbstractRobustChannel. Cast for the consumer-side
    # robustness contract.
    channel = cast(AbstractRobustChannel, await connection.channel())
    await channel.set_qos(prefetch_count=4)

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    queue = await channel.declare_queue(REQUESTED_QUEUE, durable=True)
    await queue.bind(exchange, routing_key=REQUESTED_KEY)
    await queue.consume(_handle_requested)
    logger.info(
        "planner-svc.mq queue bound",
        extra={"queue": REQUESTED_QUEUE, "routing_key": REQUESTED_KEY},
    )

    return ConsumerHandle(connection=connection, channel=channel, queue=queue)


async def run_consumer_forever() -> None:
    """Entrypoint used by ``python -m planner_svc`` to keep the consumer alive."""
    handle = await start_consumer()
    try:
        await asyncio.Future()  # block forever
    finally:
        await handle.close()


__all__ = [
    "EXCHANGE_NAME",
    "REQUESTED_KEY",
    "REQUESTED_QUEUE",
    "ConsumerHandle",
    "publish_requested",
    "run_consumer_forever",
    "start_consumer",
]
