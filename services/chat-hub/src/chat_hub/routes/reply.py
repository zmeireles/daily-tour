"""Host→guest reply + owner-inbox thread list (#281).

POST /v1/reply/{guest_id} — a human host (Miguel) answers a guest. The reply
is persisted as an `outbound` message on the guest's thread (source of truth)
and pushed best-effort over the guest's live socket; an offline guest picks it
up via GET /v1/history on reconnect, so `delivered: false` is reported but the
request still succeeds.

GET /v1/threads — the owner inbox: every guest thread with its latest message.

Both senders/providers are dependency-overridden so tests need no live DB; the
sender is built on the same in-app driver singleton the WS endpoint registers
sockets on. chat-hub does no auth of its own — only the BFF reaches it.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..chat_persistence import (
    HostReplySender,
    ThreadListProvider,
    get_host_reply_sender,
    get_thread_list_provider,
    parse_guest_id,
)

router = APIRouter()


class HostReplyBody(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


@router.post("/v1/reply/{guest_id}")
async def post_host_reply(
    guest_id: str,
    body: HostReplyBody,
    send_reply: Annotated[HostReplySender, Depends(get_host_reply_sender)],
) -> dict[str, object]:
    parsed = parse_guest_id(guest_id)
    if parsed is None:
        raise HTTPException(status_code=400, detail="guest_id must be a UUID")
    return await send_reply(parsed, body.body)


@router.get("/v1/threads")
async def get_threads(
    provider: Annotated[ThreadListProvider, Depends(get_thread_list_provider)],
) -> list[dict[str, object]]:
    return await provider()
