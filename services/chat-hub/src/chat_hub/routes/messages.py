"""Message-count read route for the owner beta-metrics dashboard.

GET /v1/messages/count?range_days=N — total chat messages in the current
N-day window and the equal window immediately before it, so the BFF can render
the "messages" KPI with a trend delta. chat-hub does no auth of its own; only
the BFF (on dt_internal) reaches it, same posture as the other read routes.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ..chat_persistence import MessageCountProvider, get_message_count_provider

router = APIRouter()


@router.get("/v1/messages/count")
async def get_message_count(
    provider: Annotated[MessageCountProvider, Depends(get_message_count_provider)],
    range_days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> dict[str, int]:
    return await provider(range_days)
