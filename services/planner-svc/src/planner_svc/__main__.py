"""Process entrypoint: serves FastAPI and runs the RabbitMQ consumer in parallel.

T-3.0.3 (slice A) — wires the aio-pika consumer alongside the API task
via ``asyncio.wait({api, mq}, FIRST_COMPLETED)``. If either task crashes,
the other is cancelled and the process exits non-zero so Compose restarts
per its policy. Mirrors the pattern in ``search-svc/__main__.py``.
"""
from __future__ import annotations

import asyncio
import logging

import uvicorn

from .config import get_settings
from .main import app
from .mq import run_consumer_forever

logger = logging.getLogger(__name__)


async def _run() -> None:
    settings = get_settings()
    config = uvicorn.Config(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
        access_log=True,
    )
    server = uvicorn.Server(config)

    api_task = asyncio.create_task(server.serve(), name="planner-svc.api")
    mq_task = asyncio.create_task(run_consumer_forever(), name="planner-svc.mq")

    done, pending = await asyncio.wait(
        {api_task, mq_task}, return_when=asyncio.FIRST_COMPLETED
    )
    for task in pending:
        task.cancel()
    for task in done:
        exc = task.exception()
        if exc is not None:
            logger.error(
                "planner-svc task crashed",
                extra={"task": task.get_name()},
            )
            raise exc


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    asyncio.run(_run())


if __name__ == "__main__":
    main()
