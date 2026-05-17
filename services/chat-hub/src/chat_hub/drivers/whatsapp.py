"""WhatsApp driver — Cloud API + deep-link fallback (T-5.6.0).

send() posts to the Meta Cloud API when credentials are configured; falls
back to a wa.me deep-link URL when they are not (T-4.3.0 behaviour).

mount_whatsapp_driver() registers two endpoints:
  GET  /v1/webhook/whatsapp — Meta hub verification challenge
  POST /v1/webhook/whatsapp — inbound message delivery

Inbound webhook payloads are HMAC-verified with X-Hub-Signature-256 when
WHATSAPP_APP_SECRET is set.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any, Final
from urllib.parse import quote

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse

from . import Channel, InboundCallback, InboundMessage, OutboundMessage

logger = logging.getLogger(__name__)

_CHANNEL: Final[Channel] = "whatsapp"
_WA_ME_BASE: Final[str] = "https://wa.me"
_GRAPH_API_BASE: Final[str] = "https://graph.facebook.com/v18.0"


def build_wa_me_url(phone: str, text: str) -> str:
    """Return a wa.me deep-link for the given phone number and pre-filled text."""
    return f"{_WA_ME_BASE}/{phone}?text={quote(text)}"


class WhatsAppDriver:
    def __init__(
        self,
        phone_number_id: str | None,
        access_token: str | None,
        verify_token: str | None = None,
        app_secret: str | None = None,
    ) -> None:
        self._phone_number_id = phone_number_id
        self._access_token = access_token
        self._verify_token = verify_token
        self._app_secret = app_secret
        self._callbacks: list[InboundCallback] = []
        if phone_number_id is None or access_token is None:
            logger.warning(
                "whatsapp driver running in deep-link mode — "
                "WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN unset",
            )

    @property
    def channel(self) -> Channel:
        return _CHANNEL

    async def send(self, message: OutboundMessage) -> str:
        """Send via Cloud API; fall back to a wa.me deep-link when credentials absent."""
        if message.channel != _CHANNEL:
            raise ValueError(f"WhatsAppDriver received message for channel {message.channel!r}")

        if self._phone_number_id is None or self._access_token is None:
            url = build_wa_me_url(message.recipient_id, message.body)
            logger.info(
                "whatsapp deep-link generated",
                extra={"recipient_id": message.recipient_id, "url": url},
            )
            return url

        payload = {
            "messaging_product": "whatsapp",
            "to": message.recipient_id,
            "type": "text",
            "text": {"body": message.body},
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{_GRAPH_API_BASE}/{self._phone_number_id}/messages",
                json=payload,
                headers={"Authorization": f"Bearer {self._access_token}"},
                timeout=30.0,
            )
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
        message_id: str = data["messages"][0]["id"]
        logger.info(
            "whatsapp message sent",
            extra={"recipient_id": message.recipient_id, "message_id": message_id},
        )
        return message_id

    def on_receive(self, callback: InboundCallback) -> None:
        self._callbacks.append(callback)

    def _verify_signature(self, body: bytes, signature_header: str | None) -> bool:
        """Return True if the body matches the X-Hub-Signature-256 header."""
        if self._app_secret is None:
            return True  # no secret configured — skip verification
        if signature_header is None:
            return False
        expected = hmac.new(
            self._app_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        try:
            _, received = signature_header.split("=", 1)
        except ValueError:
            return False
        return hmac.compare_digest(expected, received)

    async def process_webhook(self, body: bytes, signature: str | None) -> None:
        """Validate signature and dispatch inbound Meta webhook messages to callbacks."""
        if not self._verify_signature(body, signature):
            raise PermissionError("invalid webhook signature")

        payload: dict[str, Any] = json.loads(body)
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for raw_msg in value.get("messages", []):
                    text_obj = raw_msg.get("text", {})
                    inbound = InboundMessage(
                        channel=_CHANNEL,
                        sender_id=str(raw_msg.get("from", "")),
                        body=text_obj.get("body", ""),
                        external_message_id=raw_msg.get("id"),
                    )
                    for callback in self._callbacks:
                        await callback(inbound)


_driver: WhatsAppDriver | None = None


def get_whatsapp_driver() -> WhatsAppDriver:
    """Return the process-singleton WhatsApp driver, instantiating on first use."""
    global _driver
    if _driver is None:
        from ..config import get_settings

        s = get_settings()
        _driver = WhatsAppDriver(
            phone_number_id=s.whatsapp_phone_number_id,
            access_token=s.whatsapp_access_token,
            verify_token=s.whatsapp_verify_token,
            app_secret=s.whatsapp_app_secret,
        )
    return _driver


def reset_whatsapp_driver() -> None:
    """Test helper — drop the singleton so the next get_whatsapp_driver() rebuilds."""
    global _driver
    _driver = None


def mount_whatsapp_driver(app: FastAPI) -> WhatsAppDriver:
    """Register GET/POST /v1/webhook/whatsapp endpoints on `app` and return the driver."""

    @app.get("/v1/webhook/whatsapp", response_class=PlainTextResponse)
    async def whatsapp_verify(
        hub_mode: str = Query(alias="hub.mode", default=""),
        hub_challenge: str = Query(alias="hub.challenge", default=""),
        hub_verify_token: str = Query(alias="hub.verify_token", default=""),
    ) -> str:
        driver = get_whatsapp_driver()
        if hub_mode != "subscribe":
            raise HTTPException(status_code=400, detail="hub.mode must be 'subscribe'")
        if driver._verify_token is None or hub_verify_token != driver._verify_token:
            raise HTTPException(status_code=403, detail="invalid verify token")
        return hub_challenge

    @app.post("/v1/webhook/whatsapp", status_code=200)
    async def whatsapp_webhook(request: Request) -> dict[str, str]:
        driver = get_whatsapp_driver()
        body = await request.body()
        signature = request.headers.get("x-hub-signature-256")
        try:
            await driver.process_webhook(body, signature)
        except PermissionError:
            raise HTTPException(status_code=403, detail="invalid webhook signature")
        return {"ok": "true"}

    return get_whatsapp_driver()
