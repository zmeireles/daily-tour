"""WhatsApp deep-link driver (T-4.3.0).

v1 implementation: `send()` returns a wa.me deep-link URL that the PWA
opens so the user can tap-to-send from their WhatsApp app. No inbound
webhook for v1 — `on_receive` callbacks are stored but never invoked.
Real Business Cloud API integration is deferred to T-5.6.
"""
from __future__ import annotations

import logging
from typing import Final
from urllib.parse import quote

from . import Channel, InboundCallback, OutboundMessage

logger = logging.getLogger(__name__)

_CHANNEL: Final[Channel] = "whatsapp"
_WA_ME_BASE: Final[str] = "https://wa.me"


def build_wa_me_url(phone: str, text: str) -> str:
    """Return a wa.me deep-link for the given phone number and pre-filled text."""
    return f"{_WA_ME_BASE}/{phone}?text={quote(text)}"


class WhatsAppDriver:
    def __init__(self, phone_number_id: str | None, access_token: str | None) -> None:
        self._phone_number_id = phone_number_id
        self._access_token = access_token
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
        """Return a wa.me deep-link URL; recipient_id must be an E.164 phone number."""
        if message.channel != _CHANNEL:
            raise ValueError(f"WhatsAppDriver received message for channel {message.channel!r}")
        url = build_wa_me_url(message.recipient_id, message.body)
        logger.info(
            "whatsapp deep-link generated",
            extra={"recipient_id": message.recipient_id, "url": url},
        )
        return url

    def on_receive(self, callback: InboundCallback) -> None:
        # Inbound webhook deferred to T-5.6; callbacks stored but never fired.
        self._callbacks.append(callback)
