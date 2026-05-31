"""One-shot synchronous place-embedding backfill.

For dev. Reads every `published` place, embeds its EN text via the configured
embedding API, and UPSERTs into `search.place_embedding`. Runs in a single
batched API call (OpenAI accepts a list of inputs).

    uv run embed-places

This is *not* the full T-2.0.1 worker — that's the live RabbitMQ consumer in
`mq.py` that will keep embeddings fresh as catalog publishes new places. This
script just fills the table once so `/v1/discover` rerank has something to
join against during dev/testing.

Prerequisite: `EMBEDDING_API_KEY` (or `OPENAI_API_KEY`) must be set in the
search-svc environment. With no key the script exits 1 — there's no useful
no-op behaviour for a backfill.
"""
from __future__ import annotations

import asyncio
import logging
from typing import cast

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from ..config import Settings, get_settings
from ..models import Place

logger = logging.getLogger(__name__)


def _pick_text(
    localized: dict[str, str], locale_priority: tuple[str, ...] = ("en", "pt-PT")
) -> str:
    """Pick the first available locale from the priority list, fallback to any."""
    for loc in locale_priority:
        if localized.get(loc):
            return localized[loc]
    # Fallback: any non-empty value.
    for value in localized.values():
        if value:
            return value
    return ""


def _build_embed_text(place: Place) -> str:
    name = _pick_text(place.name)
    description = _pick_text(place.description)
    return f"{name}\n\n{description}\n\n{place.address}".strip()


async def _embed_batch(texts: list[str], settings: Settings) -> list[list[float]]:
    """POST a single multi-input request to the embeddings API."""
    if not settings.embedding_api_key:
        raise RuntimeError("embedding_api_key is unset — set OPENAI_API_KEY in .env")

    payload = {
        "input": texts,
        "model": settings.embedding_model,
        "dimensions": settings.embedding_dimensions,
    }
    headers = {"Authorization": f"Bearer {settings.embedding_api_key}"}

    async with httpx.AsyncClient(timeout=settings.embedding_request_timeout_seconds * 3) as client:
        resp = await client.post(
            f"{settings.embedding_api_base_url.rstrip('/')}/embeddings",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    vectors: list[list[float]] = []
    for item in data.get("data", []):
        vec = item.get("embedding")
        if not isinstance(vec, list) or len(vec) != settings.embedding_dimensions:
            raise RuntimeError(
                f"unexpected embedding shape: dim={len(vec) if isinstance(vec, list) else 'n/a'}, "
                f"expected {settings.embedding_dimensions}"
            )
        vectors.append([float(v) for v in vec])
    return vectors


def _format_vector(vec: list[float]) -> str:
    """Render list[float] as pgvector literal `[v1,v2,...]` (same as query.py)."""
    return "[" + ",".join(repr(float(v)) for v in vec) + "]"


_UPSERT_SQL = text(
    """
    INSERT INTO search.place_embedding (place_id, vec, model_version)
    VALUES (:place_id, CAST(:vec AS vector), :model_version)
    ON CONFLICT (place_id) DO UPDATE
      SET vec = EXCLUDED.vec,
          model_version = EXCLUDED.model_version,
          embedded_at = now()
    """
)


async def embed_places() -> int:
    """Backfill embeddings for every published place. Returns count written."""
    settings = get_settings()

    engine = create_async_engine(settings.database_url, echo=False)
    try:
        async with AsyncSession(engine) as session:
            rows = await session.execute(select(Place).where(Place.status == "published"))
            places = list(rows.scalars())

            if not places:
                logger.info("embed_places: no published places, nothing to do")
                return 0

            texts = [_build_embed_text(p) for p in places]
            logger.info(
                "embed_places: embedding %d places via %s",
                len(places),
                settings.embedding_model,
            )
            vectors = await _embed_batch(texts, settings)

            assert len(vectors) == len(places), (
                f"embedding count mismatch: got {len(vectors)}, expected {len(places)}"
            )

            for place, vec in zip(places, vectors, strict=True):
                await session.execute(
                    _UPSERT_SQL,
                    {
                        "place_id": str(cast(object, place.id)),
                        "vec": _format_vector(vec),
                        "model_version": settings.embedding_model,
                    },
                )
            await session.commit()
    finally:
        await engine.dispose()

    logger.info("embed_places: upserted %d embeddings", len(places))
    return len(places)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(embed_places())


if __name__ == "__main__":
    main()
