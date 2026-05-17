"""RAG retriever tests — search-svc HTTP boundary mocked via httpx.MockTransport."""
from __future__ import annotations

import json
from uuid import UUID

import httpx
import pytest
from daily_tour_common import Geom

from planner_svc.config import Settings
from planner_svc.rag.retriever import RetrievalError, retrieve

_SP = Geom(lat=37.7402, lng=-25.6783)
_PID = "33333333-3333-4333-8333-333333333333"


async def test_retrieve_parses_search_svc_response_and_forwards_body() -> None:
    seen_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_requests.append(request)
        return httpx.Response(
            200,
            json={
                "action": "swim",
                "wish": "hot-springs",
                "count": 1,
                "reranked": True,
                "results": [
                    {"place_id": _PID, "distance_km": 4.21, "score": 0.733},
                    {"place_id": _PID, "distance_km": 7.05, "score": None},
                ],
            },
        )

    settings = Settings(search_svc_url="http://search-svc.test:8082")
    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        results = await retrieve(
            action="swim",
            wish="hot-springs",
            free_text="warm pools at dusk",
            loc=_SP,
            km=15.0,
            k=5,
            settings=settings,
            client=client,
        )

    assert len(seen_requests) == 1
    sent = seen_requests[0]
    assert str(sent.url) == "http://search-svc.test:8082/v1/query"
    body = json.loads(sent.content)
    assert body == {
        "action": "swim",
        "wish": "hot-springs",
        "free_text": "warm pools at dusk",
        "loc": {"lat": _SP.lat, "lng": _SP.lng},
        "km": 15.0,
        "limit": 5,
    }

    assert len(results) == 2
    assert results[0].place_id == UUID(_PID)
    assert results[0].distance_km == 4.21
    assert results[0].score == 0.733
    assert results[1].score is None


async def test_retrieve_raises_on_non_200_response() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="search-svc down")

    settings = Settings(search_svc_url="http://search-svc.test:8082")
    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(RetrievalError, match="503"):
            await retrieve(
                action="swim",
                wish=None,
                free_text=None,
                loc=_SP,
                km=10.0,
                k=3,
                settings=settings,
                client=client,
            )
