"""RAG retrieval — wraps search-svc POST /v1/query (T-3.0.1).

One call per requested action slug; the caller (T-3.0.3 plan worker)
fans out across `PlanRequest.action_wishes`. Network I/O is the only
side effect, and the HTTPX client is injectable so tests can plug in
`httpx.MockTransport` instead of running search-svc.

The response schema (place_id, distance_km, score) is owned by
search-svc — see services/search-svc/src/search_svc/api/schemas.py.
We translate to a small frozen dataclass to keep the dependency
one-way and to avoid pulling the search-svc package into planner-svc.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import httpx
from daily_tour_common import Geom

from ..config import Settings, get_settings

_DEFAULT_TIMEOUT_SECONDS = 10.0


@dataclass(frozen=True, slots=True)
class RetrievedPlace:
    """One candidate from search-svc /v1/query."""

    place_id: UUID
    distance_km: float
    score: float | None


class RetrievalError(RuntimeError):
    """Raised when search-svc returns a non-2xx or unparseable body."""


async def retrieve(
    *,
    action: str,
    wish: str | None,
    free_text: str | None,
    loc: Geom,
    km: float,
    k: int,
    settings: Settings | None = None,
    client: httpx.AsyncClient | None = None,
) -> list[RetrievedPlace]:
    """Call search-svc /v1/query for one action and return parsed candidates.

    Arguments mirror the underlying search-svc body (`wish` and
    `free_text` are forwarded as-is so the embedding re-rank uses the
    guest's words; see search-svc `_pick_rerank_text`).

    When `client` is None, a transient `httpx.AsyncClient` is opened
    and closed for the call — fine for tests and the one-shot worker
    path. Production code may pass a long-lived pooled client.
    """
    if settings is None:
        settings = get_settings()

    url = f"{settings.search_svc_url.rstrip('/')}/v1/query"
    payload: dict[str, Any] = {
        "action": action,
        "loc": {"lat": loc.lat, "lng": loc.lng},
        "km": km,
        "limit": k,
    }
    if wish is not None:
        payload["wish"] = wish
    if free_text is not None:
        payload["free_text"] = free_text

    # search-svc denies by default (dt-tests #44), so every retrieval call must
    # present its token — including this service-to-service hop, which is not
    # exempt just because both ends are ours. Network membership is not identity.
    headers = {"x-internal-token": settings.search_svc_internal_token}

    if client is not None:
        response = await client.post(url, json=payload, headers=headers)
    else:
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT_SECONDS) as owned:
            response = await owned.post(url, json=payload, headers=headers)

    if response.status_code != httpx.codes.OK:
        raise RetrievalError(
            f"search-svc /v1/query returned {response.status_code}: {response.text!r}"
        )

    try:
        body = response.json()
    except ValueError as exc:
        raise RetrievalError(f"search-svc /v1/query returned non-JSON body: {exc}") from exc

    return _parse_results(body)


def _parse_results(body: object) -> list[RetrievedPlace]:
    if not isinstance(body, dict):
        raise RetrievalError(f"search-svc /v1/query body is not an object: {type(body).__name__}")
    raw = body.get("results", [])
    if not isinstance(raw, list):
        raise RetrievalError(f"search-svc /v1/query 'results' is not a list: {type(raw).__name__}")

    parsed: list[RetrievedPlace] = []
    for item in raw:
        if not isinstance(item, dict):
            raise RetrievalError(f"result item is not an object: {type(item).__name__}")
        try:
            place_id = UUID(str(item["place_id"]))
            distance_km = float(item["distance_km"])
        except (KeyError, ValueError) as exc:
            raise RetrievalError(f"result item malformed: {item!r}") from exc
        score_raw = item.get("score")
        score = None if score_raw is None else float(score_raw)
        parsed.append(RetrievedPlace(place_id=place_id, distance_km=distance_km, score=score))
    return parsed


__all__ = ["RetrievalError", "RetrievedPlace", "retrieve"]
