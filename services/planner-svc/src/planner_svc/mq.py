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
from .repository.plans import get_by_id, mark_ready, mark_rejected
from .workers.plan_worker import WorkerError, produce_plan

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "planner"
REQUESTED_KEY = "tour-plan.requested"
REQUESTED_QUEUE = "planner.tour-plan.requested"
# Dead-letter to the canonical project DLX (#147). A poison-pill message (an
# unexpected exception in _process_plan → nack with requeue=False) is routed
# to dt.dlx instead of being silently dropped; dt.dlx fans every dead message
# into dt.dlx.unrouted for ops inspection (infra/rabbitmq/definitions.json).
# This is the same convention every other project queue uses — planner's queue
# was the lone exception (declared at runtime, off the canonical dt.events bus).
DEAD_LETTER_EXCHANGE = "dt.dlx"


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


async def _process_plan(plan_id: UUID) -> None:
    """Slice-B real pipeline: load row → produce plan → mark_ready or mark_rejected.

    Reads the queued ``planner.tour_plan`` row, runs the full RAG + LLM
    pipeline via ``workers.plan_worker.produce_plan``, and writes the
    terminal state back. Categorised ``WorkerError`` failures land in
    ``mark_rejected`` with the reason slug + detail so the BFF GET
    endpoint surfaces them to the PWA's failure-fallback UI (T-3.1.2).

    Unexpected exceptions propagate so the message gets nacked (default
    ``message.process()`` semantics in the caller) — operations can then
    see a poison-pill in RabbitMQ and react.
    """
    async with session_scope() as session:
        row = await get_by_id(session, plan_id)
    if row is None:
        logger.warning(
            "planner-svc.mq orphan message; plan row missing",
            extra={"plan_id": str(plan_id)},
        )
        return

    try:
        plan, _candidates = await produce_plan(
            plan_id=plan_id,
            request_payload=dict(row.request_payload),
        )
    except WorkerError as exc:
        async with session_scope() as session:
            await mark_rejected(session, plan_id, str(exc))
            await session.commit()
        logger.warning(
            "planner-svc.mq marked rejected",
            extra={"plan_id": str(plan_id), "reason": exc.reason, "detail": exc.detail},
        )
        return

    async with session_scope() as session:
        await mark_ready(session, plan_id, plan.model_dump(mode="json"))
        await session.commit()
    logger.info(
        "planner-svc.mq marked ready",
        extra={"plan_id": str(plan_id), "step_count": len(plan.steps)},
    )


async def _handle_requested(message: AbstractIncomingMessage) -> None:
    """Consumer handler — parses the message and dispatches to the processor.

    ``requeue=False`` on the process context-manager means an exception
    raised by ``_process_plan`` ACKs the message (with a nack-no-requeue),
    so we don't re-process poison-pill payloads in a tight loop.
    ``WorkerError`` is caught and translated to ``mark_rejected`` inside
    ``_process_plan``, so the handler only sees unexpected exceptions.
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
        await _process_plan(plan_id)


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

    # Point the main queue's dead-letters at the canonical dt.dlx (pre-declared
    # in definitions.json). NOTE: queue arguments are immutable in RabbitMQ — an
    # existing queue declared without this arg must be deleted so it re-declares
    # with it (fresh deploys get it from the start; dev: see the PR verification).
    queue = await channel.declare_queue(
        REQUESTED_QUEUE,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DEAD_LETTER_EXCHANGE,
            "x-dead-letter-routing-key": REQUESTED_QUEUE,
        },
    )
    await queue.bind(exchange, routing_key=REQUESTED_KEY)
    await queue.consume(_handle_requested)
    logger.info(
        "planner-svc.mq queue bound",
        extra={
            "queue": REQUESTED_QUEUE,
            "routing_key": REQUESTED_KEY,
            "dead_letter_exchange": DEAD_LETTER_EXCHANGE,
        },
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
    "DEAD_LETTER_EXCHANGE",
    "EXCHANGE_NAME",
    "REQUESTED_KEY",
    "REQUESTED_QUEUE",
    "ConsumerHandle",
    "publish_requested",
    "run_consumer_forever",
    "start_consumer",
]
