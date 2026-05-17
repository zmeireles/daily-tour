"""Process entrypoint — serves the FastAPI app via uvicorn."""
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
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    asyncio.run(_run())


if __name__ == "__main__":
    main()
