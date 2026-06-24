"""POST /v1/draft/reservation — AI reservation draft endpoint (T-4.4.0).

The PWA sends the user's chat context + selected place + dates and the
endpoint returns a draft message the guest reviews before sending.
Anthropic is called server-side so the API key never leaves the backend.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..config import get_settings
from ..drafting import DraftRequest, draft_reservation

router = APIRouter()


class ReservationDraftBody(BaseModel):
    # Defensive input-size caps (T-3.C.3): this route reaches Anthropic, so bound
    # every free-text field even though it's currently unwired (no BFF/PWA caller).
    place_id: str = Field(..., min_length=1)
    place_name: str = Field(..., min_length=1, max_length=200)
    dates: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Free-form date range, e.g. '2026-06-12 19:30'",
    )
    guest_message: str = Field("", max_length=2000, description="Optional context from the guest")
    party_size: int | None = Field(default=None, ge=1, le=50)
    locale: str | None = Field(
        default=None,
        description="BCP-47 tag; 'pt-PT' or 'en' supported in v1",
    )


class ReservationDraftResponse(BaseModel):
    text: str
    locale: str
    source: str


@router.post("/v1/draft/reservation", response_model=ReservationDraftResponse)
async def post_reservation_draft(body: ReservationDraftBody) -> ReservationDraftResponse:
    settings = get_settings()
    result = await draft_reservation(
        settings=settings,
        request=DraftRequest(
            place_id=body.place_id,
            place_name=body.place_name,
            dates=body.dates,
            guest_message=body.guest_message,
            party_size=body.party_size,
            locale=body.locale,
        ),
    )
    return ReservationDraftResponse(text=result.text, locale=result.locale, source=result.source)
