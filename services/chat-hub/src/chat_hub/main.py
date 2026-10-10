"""FastAPI app factory."""
from __future__ import annotations

import logging

from daily_tour_common.internal_auth import InternalAuthMiddleware
from daily_tour_common.otel import init_otel
from daily_tour_common.sentry import init_sentry
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .chat_persistence import build_in_app_persister
from .config import get_settings
from .db import dispose_engine
from .drivers.in_app import mount_in_app_driver
from .drivers.telegram import mount_telegram_driver
from .drivers.whatsapp import build_wa_me_url, mount_whatsapp_driver
from .routes import (
    draft_router,
    health_router,
    history_router,
    messages_router,
    reply_router,
)
from .version import __version__

logger = logging.getLogger(__name__)

init_otel("chat-hub")
# Error reporting runs alongside OTel. DSN-gated: a complete no-op when
# SENTRY_DSN is unset/empty, so this is safe before a Sentry-compatible
# backend (GlitchTip) exists.
init_sentry("chat-hub", release=__version__)


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
    # The two provider webhooks are exempt: WhatsApp and Telegram are EXTERNAL
    # callers by design and cannot present an internal token. Each verifies its own
    # caller instead — WhatsApp by `x-hub-signature-256` HMAC and the `hub.verify_token`
    # challenge, Telegram by `x-telegram-bot-api-secret-token`.
    #
    # ⚠️ Telegram's check was fail-open when this landed (`if self._webhook_secret
    # and ...` — skipped entirely with the secret unset). Exempting the path is what
    # would have made that reachable, so it was closed in the same change; see
    # `drivers/telegram.py::process_update`. Do not re-open one without the other.
    app.add_middleware(
        InternalAuthMiddleware,
        token=settings.internal_token,
        extra_open_paths={"/v1/webhook/telegram", "/v1/webhook/whatsapp"},
    )

    app.include_router(health_router)
    app.include_router(draft_router)
    app.include_router(history_router)
    app.include_router(messages_router)
    app.include_router(reply_router)
    in_app_driver = mount_in_app_driver(app)
    # Persist every inbound guest frame + ack it back (T-4.0.1). Without this
    # callback the driver receives, normalizes, and drops frames.
    in_app_driver.on_receive(build_in_app_persister(in_app_driver))
    mount_telegram_driver(app)
    mount_whatsapp_driver(app)

    @app.get("/v1/chat/whatsapp/draft")
    async def whatsapp_draft(
        phone: str = Query(..., description="E.164 phone number, e.g. 15551234567"),
        text: str = Query(..., description="Pre-filled message body"),
    ) -> dict[str, str]:
        """Return a wa.me deep-link for the PWA to open on the user's device."""
        return {"url": build_wa_me_url(phone, text)}

    @app.on_event("startup")
    async def _startup() -> None:
        logger.info(
            "chat-hub starting",
            extra={"service": settings.service_name, "version": __version__},
        )

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await dispose_engine()

    return app


app = create_app()
