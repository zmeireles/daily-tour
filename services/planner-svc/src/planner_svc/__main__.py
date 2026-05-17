"""Process entrypoint: serves FastAPI (T-3.0.0 skeleton).

T-3.0.3 will add an aio-pika consumer for async tour-plan jobs alongside
this API task — see search-svc/__main__.py for the asyncio.gather pattern
we'll mirror once that lands.
"""
from __future__ import annotations

import asyncio
import logging

import uvicorn

from .config import get_settings
from .main import app

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
    await server.serve()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(_run())


if __name__ == "__main__":
    main()
