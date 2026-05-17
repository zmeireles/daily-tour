"""POST /v1/notify/post-stay — dispatch a post-stay review email."""
from __future__ import annotations

import email.message
import logging
import urllib.parse
from typing import Literal

import aiosmtplib
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from ..config import Settings, get_settings
from ..templates.post_stay import render_post_stay

logger = logging.getLogger(__name__)

router = APIRouter()


class PostStayRequest(BaseModel):
    guest_email: EmailStr
    guest_name: str
    reservation_id: str
    guesthouse_name: str
    review_url: str
    locale: Literal["en", "pt-PT"] = "en"


class PostStayResponse(BaseModel):
    sent: bool
    channel: str
    recipient: str


@router.post("/v1/notify/post-stay", response_model=PostStayResponse)
async def post_stay_notify(
    body: PostStayRequest,
    settings: Settings = Depends(get_settings),
) -> PostStayResponse:
    content = render_post_stay(
        guest_name=body.guest_name,
        guesthouse_name=body.guesthouse_name,
        review_url=body.review_url,
        locale=body.locale,
    )

    msg = email.message.EmailMessage()
    msg["Subject"] = content.subject
    msg["From"] = settings.smtp_from
    msg["To"] = body.guest_email
    msg.set_content(content.text_body)

    parsed = urllib.parse.urlparse(settings.smtp_url)
    use_tls = parsed.scheme == "smtps"
    start_tls = parsed.scheme == "smtp+starttls"
    hostname = parsed.hostname or "localhost"
    port = parsed.port or (465 if use_tls else 587 if start_tls else 25)
    username = parsed.username or None
    password = urllib.parse.unquote(parsed.password) if parsed.password else None

    try:
        await aiosmtplib.send(
            msg,
            hostname=hostname,
            port=port,
            username=username,
            password=password,
            use_tls=use_tls,
            start_tls=start_tls,
        )
    except Exception as exc:
        logger.exception(
            "notif-svc: SMTP send failed",
            extra={"recipient": body.guest_email, "reservation_id": body.reservation_id},
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="smtp_send_failed",
        ) from exc

    logger.info(
        "notif-svc: post-stay email sent",
        extra={"recipient": body.guest_email, "reservation_id": body.reservation_id},
    )
    return PostStayResponse(sent=True, channel="email", recipient=str(body.guest_email))
