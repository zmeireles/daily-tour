"""Anthropic Messages API wrapper (T-3.0.0 skeleton).

A thin async client around `anthropic.AsyncAnthropic`. T-3.0.1 wires this to
the RAG context-builder; T-3.0.2 adds JSON-schema-validated tour-plan output.
Here we ship only the boundary: model/keys/timeout pulled from `Settings`,
no business logic.

When `anthropic_api_key` is unset (dev/CI without a real key), `generate`
returns None. This matches search-svc's "warn-and-skip" posture so the
service still boots in environments without an Anthropic key.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from anthropic import AsyncAnthropic

from .config import Settings

if TYPE_CHECKING:
    from anthropic.types import MessageParam

logger = logging.getLogger(__name__)


class LLMError(RuntimeError):
    """Raised when the Anthropic API returns an unexpected response."""


def build_client(settings: Settings) -> AsyncAnthropic | None:
    """Return an AsyncAnthropic client, or None when no API key is configured."""
    if not settings.anthropic_api_key:
        logger.warning("build_client: no anthropic_api_key configured, returning None")
        return None
    return AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        timeout=settings.anthropic_request_timeout_seconds,
    )


async def generate(
    *,
    settings: Settings,
    system: str,
    messages: list[MessageParam],
    client: AsyncAnthropic | None = None,
) -> str | None:
    """Call Anthropic Messages API and return the concatenated text content.

    `client` is injectable so tests can stub the SDK without monkeypatching
    the module — pass a mock that exposes `.messages.create(...)`.

    Returns None when no client is available (no API key in dev/CI).
    """
    if client is None:
        client = build_client(settings)
    if client is None:
        return None

    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.anthropic_max_tokens,
        system=system,
        messages=messages,
    )

    text_chunks: list[str] = []
    for block in response.content:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            text_chunks.append(text)

    if not text_chunks:
        raise LLMError(f"no text blocks in Anthropic response: {response!r}")
    return "".join(text_chunks)
