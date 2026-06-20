"""FastAPI app factory."""
from __future__ import annotations

import logging

from daily_tour_common.otel import init_otel
from daily_tour_common.sentry import init_sentry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import health_router, plans_router
from .version import __version__

logger = logging.getLogger(__name__)

init_otel("planner-svc")
# Error reporting runs alongside OTel. DSN-gated: a complete no-op when
# SENTRY_DSN is unset/empty, so this is safe before a Sentry-compatible
# backend (GlitchTip) exists.
init_sentry("planner-svc", release=__version__)


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
    app.include_router(plans_router)

    @app.on_event("startup")
    async def _startup() -> None:
        logger.info(
            "planner-svc starting",
            extra={"service": settings.service_name, "version": __version__},
        )

    return app


app = create_app()
