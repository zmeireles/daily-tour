"""Reservation draft generation (T-4.4.0).

Thin async wrapper around `anthropic.AsyncAnthropic`. The shape mirrors
planner-svc's `llm.generate` — boundary-mocked tests, no business logic
in the SDK call, and a "no-key → deterministic fallback" path so dev/CI
boots without `ANTHROPIC_API_KEY`.

The fallback isn't an error path: a guest in a no-key environment still
gets a sendable message, just not an LLM-polished one. Production keys
gate the model call but never the route.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from anthropic import AsyncAnthropic

from ..config import Settings
from .prompt_template import (
    build_system_prompt,
    build_user_prompt,
    normalize_locale,
)

if TYPE_CHECKING:
    from anthropic.types import MessageParam

logger = logging.getLogger(__name__)


class DraftError(RuntimeError):
    """Raised when Anthropic returns an unexpected (non-text) response."""


@dataclass(frozen=True, slots=True)
class DraftRequest:
    place_id: str
    place_name: str
    dates: str
    guest_message: str
    party_size: int | None = None
    locale: str | None = None


@dataclass(frozen=True, slots=True)
class DraftResult:
    text: str
    locale: str
    source: str  # "anthropic" | "fallback"


def build_client(settings: Settings) -> AsyncAnthropic | None:
    if not settings.anthropic_api_key:
        logger.warning("drafter disabled — ANTHROPIC_API_KEY unset")
        return None
    return AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        timeout=settings.anthropic_request_timeout_seconds,
    )


def _fallback_text(req: DraftRequest, locale: str) -> str:
    """Deterministic message used when no Anthropic key is configured."""
    party = req.party_size if req.party_size is not None else 2
    if locale == "pt-PT":
        return (
            f"Olá, gostaria de reservar uma mesa no {req.place_name} "
            f"para {party} pessoas em {req.dates}. "
            f"{req.guest_message} "
            "Podem confirmar a disponibilidade? Obrigado."
        ).strip()
    return (
        f"Hi, I'd like to book a table at {req.place_name} for {party} "
        f"on {req.dates}. {req.guest_message} "
        "Could you confirm availability? Thanks."
    ).strip()


async def draft_reservation(
    *,
    settings: Settings,
    request: DraftRequest,
    client: AsyncAnthropic | None = None,
) -> DraftResult:
    """Produce a reservation draft for `request`.

    Pass `client` to inject a stub in tests — anything with
    `.messages.create(...)` works, matching planner-svc's `generate`.
    """
    locale = normalize_locale(request.locale)

    if client is None:
        client = build_client(settings)
    if client is None:
        return DraftResult(
            text=_fallback_text(request, locale),
            locale=locale,
            source="fallback",
        )

    system = build_system_prompt(locale)
    user_text = build_user_prompt(
        place_name=request.place_name,
        dates=request.dates,
        party_size=request.party_size,
        guest_message=request.guest_message,
        locale=locale,
    )
    messages: list[MessageParam] = [{"role": "user", "content": user_text}]

    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.anthropic_max_tokens,
        system=system,
        messages=messages,
    )

    chunks: list[str] = []
    for block in response.content:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            chunks.append(text)
    if not chunks:
        raise DraftError(f"no text blocks in Anthropic response: {response!r}")

    return DraftResult(text="".join(chunks).strip(), locale=locale, source="anthropic")
