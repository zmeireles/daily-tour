"""Chat history read route (T-4.0.1).

GET /v1/history/{guest_id} — oldest-first messages for a guest, so the PWA
can re-hydrate the chat thread after a page reload (UAT-G08 step 5). The BFF
proxies this behind /v1/chat/history, deriving guest_id from the JWT `sub`;
chat-hub does no auth of its own (it is not internet-facing — only the BFF
reaches it, same posture as the /ws bridge).
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..chat_persistence import HistoryProvider, get_history_provider, parse_guest_id

router = APIRouter()


@router.get("/v1/history/{guest_id}")
async def get_history(
    guest_id: str,
    provider: Annotated[HistoryProvider, Depends(get_history_provider)],
) -> dict[str, list[dict[str, object]]]:
    parsed = parse_guest_id(guest_id)
    if parsed is None:
        raise HTTPException(status_code=400, detail="guest_id must be a UUID")
    messages = await provider(parsed)
    return {"messages": messages}
