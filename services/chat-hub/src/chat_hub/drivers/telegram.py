"""Telegram driver — stub.

T-4.2.x fills in the long-poll consumer + Bot API send/webhook. This
stub satisfies the `MessageDriver` Protocol so the core can wire it up
unconditionally; calls no-op (with a structured warning) when the bot
token is unset, matching planner-svc's ANTHROPIC_API_KEY posture.
"""
from __future__ import annotations

import logging
from typing import Final

from . import Channel, InboundCallback, OutboundMessage

logger = logging.getLogger(__name__)

_CHANNEL: Final[Channel] = "telegram"


class TelegramDriver:
    def __init__(self, bot_token: str | None) -> None:
        self._bot_token = bot_token
        self._callbacks: list[InboundCallback] = []
        if bot_token is None:
            logger.warning("telegram driver disabled — TELEGRAM_BOT_TOKEN unset")

    @property
    def channel(self) -> Channel:
        return _CHANNEL

    async def send(self, message: OutboundMessage) -> str:
        if message.channel != _CHANNEL:
            raise ValueError(f"TelegramDriver received message for channel {message.channel!r}")
        if self._bot_token is None:
            logger.warning(
                "telegram send skipped — driver disabled",
                extra={"recipient_id": message.recipient_id},
            )
            return ""
        raise NotImplementedError("TelegramDriver.send is implemented in T-4.2")

    def on_receive(self, callback: InboundCallback) -> None:
        self._callbacks.append(callback)
