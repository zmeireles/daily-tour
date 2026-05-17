"""WhatsApp driver — stub.

T-4.3.x picks one of:
  - `wa.me` deep-link (draft-and-handoff, day-1 substitute per D9)
  - WhatsApp Business Cloud API (Phase 5, behind BSP onboarding gate)
This stub satisfies the `MessageDriver` Protocol so the core can wire it
up unconditionally; calls no-op (with a structured warning) when creds
are unset.
"""
from __future__ import annotations

import logging
from typing import Final

from . import Channel, InboundCallback, OutboundMessage

logger = logging.getLogger(__name__)

_CHANNEL: Final[Channel] = "whatsapp"


class WhatsAppDriver:
    def __init__(self, phone_number_id: str | None, access_token: str | None) -> None:
        self._phone_number_id = phone_number_id
        self._access_token = access_token
        self._callbacks: list[InboundCallback] = []
        if phone_number_id is None or access_token is None:
            logger.warning(
                "whatsapp driver disabled — WHATSAPP_PHONE_NUMBER_ID or "
                "WHATSAPP_ACCESS_TOKEN unset",
            )

    @property
    def channel(self) -> Channel:
        return _CHANNEL

    async def send(self, message: OutboundMessage) -> str:
        if message.channel != _CHANNEL:
            raise ValueError(f"WhatsAppDriver received message for channel {message.channel!r}")
        if self._phone_number_id is None or self._access_token is None:
            logger.warning(
                "whatsapp send skipped — driver disabled",
                extra={"recipient_id": message.recipient_id},
            )
            return ""
        raise NotImplementedError("WhatsAppDriver.send is implemented in T-4.3")

    def on_receive(self, callback: InboundCallback) -> None:
        self._callbacks.append(callback)
