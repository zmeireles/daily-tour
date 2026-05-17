"""POST /v1/query — hybrid SQL geo+tag ∩ vector re-rank (T-2.1.0)."""
from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Awaitable, Callable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings, get_settings
from ..db import session_scope
from ..embeddings import embed_query
from ..repository.query import query_places
from .schemas import QueryRequest, QueryResponse, QueryResultItem

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_scope() as session:
        yield session


# Type alias for the embedder dependency. Exposed as a callable so tests can
# inject a deterministic fake (returning a fixed list[float]) via FastAPI's
# `app.dependency_overrides`, without needing to hit OpenAI.
Embedder = Callable[[str, Settings], Awaitable[list[float] | None]]


def get_embedder() -> Embedder:
    async def _embed(text: str, settings: Settings) -> list[float] | None:
        return await embed_query(text, settings=settings)

    return _embed


@router.post("/v1/query", response_model=QueryResponse)
async def post_query(
    body: QueryRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    embedder: Embedder = Depends(get_embedder),
) -> QueryResponse:
    rerank_text = _pick_rerank_text(body)
    query_vec: list[float] | None = None
    if rerank_text is not None:
        try:
            query_vec = await embedder(rerank_text, settings)
        except Exception:
            logger.exception("post_query: embed_query failed; falling back to distance order")
            query_vec = None

    try:
        hits = await query_places(
            session,
            action_slug=body.action,
            wish_slug=body.wish,
            lat=body.loc.lat,
            lng=body.loc.lng,
            km=body.km,
            query_vec=query_vec,
            limit=body.limit,
        )
    except Exception as exc:
        logger.exception("post_query: SQL query failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="query_failed",
        ) from exc

    reranked = query_vec is not None and any(h.score is not None for h in hits)
    return QueryResponse(
        action=body.action,
        wish=body.wish,
        count=len(hits),
        reranked=reranked,
        results=[
            QueryResultItem(place_id=h.place_id, distance_km=h.distance_km, score=h.score)
            for h in hits
        ],
    )


def _pick_rerank_text(body: QueryRequest) -> str | None:
    """Pick the text we'll embed for re-ranking.

    Priority: explicit free_text > wish slug. When neither is set we return
    None, which short-circuits the embed call and the SQL query runs in
    distance-only mode.
    """
    if body.free_text and body.free_text.strip():
        return body.free_text.strip()
    if body.wish:
        return body.wish.replace("-", " ")
    return None
