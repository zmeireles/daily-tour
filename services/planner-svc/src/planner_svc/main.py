"""FastAPI app factory."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import health_router
from .version import __version__

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.service_name, version=__version__)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

    app.include_router(health_router)

    @app.on_event("startup")
    async def _startup() -> None:
        logger.info(
            "planner-svc starting",
            extra={"service": settings.service_name, "version": __version__},
        )

    return app


app = create_app()
