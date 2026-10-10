"""FastAPI app factory."""
from __future__ import annotations

import logging

from daily_tour_common.internal_auth import InternalAuthMiddleware
from daily_tour_common.otel import init_otel
from daily_tour_common.sentry import init_sentry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import health_router, notify_router
from .version import __version__

logger = logging.getLogger(__name__)

init_otel("notif-svc")
# Error reporting runs alongside OTel. DSN-gated: a complete no-op when
# SENTRY_DSN is unset/empty, so this is safe before a Sentry-compatible
# backend (GlitchTip) exists.
init_sentry("notif-svc", release=__version__)


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

    # Deny-by-default internal-token gate (dt-tests #44/#45). Middleware, not a
    # per-route Depends(...): a dependency guards only the routes that remember
    # to list it, so a route added later would be born open. Applied last so it
    # runs OUTERMOST — an unauthenticated caller is turned away before CORS or
    # any handler sees the request.
    app.add_middleware(InternalAuthMiddleware, token=settings.internal_token)

    app.include_router(health_router)
    app.include_router(notify_router)

    @app.on_event("startup")
    async def _startup() -> None:
        logger.info(
            "notif-svc starting",
            extra={"service": settings.service_name, "version": __version__},
        )

    return app


app = create_app()
