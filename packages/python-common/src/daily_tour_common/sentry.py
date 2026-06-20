"""DSN-gated Sentry error reporting for Daily Tour Python services.

Runs alongside :mod:`daily_tour_common.otel` — it does not replace or reorder
OTel. When ``SENTRY_DSN`` is unset or empty, :func:`init_sentry` is a complete
no-op: the SDK is never initialised. This lets the SDK ship before a
Sentry-compatible backend (GlitchTip) exists.
"""
import logging
import os

import structlog

logger = structlog.get_logger(__name__)

_initialized = False


def _resolve_dsn() -> str | None:
    dsn = os.environ.get("SENTRY_DSN")
    # Empty string is treated identically to unset — both mean "disabled".
    if not dsn:
        return None
    return dsn


def _resolve_environment() -> str:
    # Prefer the same signal otel uses so both agree on the environment label.
    return (
        os.environ.get("OTEL_DEPLOYMENT_ENVIRONMENT")
        or os.environ.get("APP_ENV")
        or "development"
    )


def init_sentry(service_name: str, *, release: str | None = None) -> bool:
    """Initialise Sentry for a service. No-op when ``SENTRY_DSN`` is absent.

    :param service_name: Sets the Sentry ``service`` tag.
    :param release: Optional release; falls back to ``SENTRY_SERVICE_VERSION`` then ``0.0.0``.
    :returns: ``True`` if Sentry was initialised, ``False`` if disabled (no DSN).
    """
    global _initialized
    if _initialized:
        logging.getLogger(__name__).warning(
            "[daily-tour-common] init_sentry() called more than once — ignoring."
        )
        return False

    dsn = _resolve_dsn()
    # Hard contract: no DSN → disabled, total no-op.
    if dsn is None:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logging.getLogger(__name__).warning(
            "sentry-sdk not available; skipping Sentry init."
        )
        return False

    _initialized = True

    resolved_release = (
        release or os.environ.get("SENTRY_SERVICE_VERSION") or "0.0.0"
    )

    sentry_sdk.init(
        dsn=dsn,
        release=resolved_release,
        environment=_resolve_environment(),
        # Errors only for now; tracing stays with the OTel SDK.
        traces_sample_rate=0.0,
        integrations=[StarletteIntegration(), FastApiIntegration()],
    )
    sentry_sdk.set_tag("service", service_name)

    return True


def capture_exception(error: BaseException) -> None:
    """Report an exception caught outside the HTTP request lifecycle — e.g. a
    background message-queue consumer whose errors never reach the FastAPI
    integration.

    No-op when Sentry was not initialised (DSN absent), so callers can wire it
    unconditionally inside their existing except blocks.
    """
    if not _initialized:
        return

    try:
        import sentry_sdk
    except ImportError:
        return

    sentry_sdk.capture_exception(error)
