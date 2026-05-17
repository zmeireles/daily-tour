"""Embed a query string for the /v1/query re-rank step (T-2.1.0).

This mirrors the model used by the backfill worker (T-2.0.1) so query vectors
live in the same space as the stored place vectors. Provider/model/dimensions
are read from `Settings` — the worker and this module MUST stay in lockstep
or cosine similarities are meaningless.

When `embedding_api_key` is unset (dev/CI without a real key), `embed_query`
returns None. The handler then falls back to distance-only ordering rather
than 503'ing — this matches the worker's "warn-and-skip" posture in dev.
"""
from __future__ import annotations

import logging

import httpx

from .config import Settings

logger = logging.getLogger(__name__)


class EmbeddingError(RuntimeError):
    """Raised when the embedding provider returns an unexpected response."""


async def embed_query(text: str, *, settings: Settings) -> list[float] | None:
    """Return a query embedding, or None if no API key is configured.

    Only the OpenAI-compatible JSON shape is implemented — Voyage uses the
    same request body via its OpenAI-compatible endpoint, so the same client
    works for both providers given the right `embedding_api_base_url`.
    """
    if not settings.embedding_api_key:
        logger.warning("embed_query: no embedding_api_key configured, skipping re-rank")
        return None

    payload = {
        "input": text,
        "model": settings.embedding_model,
        "dimensions": settings.embedding_dimensions,
    }
    headers = {"Authorization": f"Bearer {settings.embedding_api_key}"}

    async with httpx.AsyncClient(timeout=settings.embedding_request_timeout_seconds) as client:
        resp = await client.post(
            f"{settings.embedding_api_base_url.rstrip('/')}/embeddings",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    try:
        vec = data["data"][0]["embedding"]
    except (KeyError, IndexError, TypeError) as exc:
        raise EmbeddingError(f"unexpected embedding response shape: {data!r}") from exc

    if not isinstance(vec, list) or len(vec) != settings.embedding_dimensions:
        raise EmbeddingError(
            f"embedding dim mismatch: got {len(vec) if isinstance(vec, list) else 'non-list'}, "
            f"expected {settings.embedding_dimensions}"
        )
    return [float(v) for v in vec]
