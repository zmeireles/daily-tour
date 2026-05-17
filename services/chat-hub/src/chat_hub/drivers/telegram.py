"""Telegram driver — aiogram-backed implementation (T-4.2.0).

Mounts `/v1/webhook/telegram` on the FastAPI app. The driver uses
`aiogram.Bot` for outbound sends and `aiogram.types.Update` to parse
inbound webhook payloads, dispatching each text message to every
registered `on_receive` callback.

When `bot_token` is unset the driver short-circuits with a warning on
`send` (same posture as planner-svc's ANTHROPIC_API_KEY). Inbound
`process_update` still fans out to callbacks regardless — the webhook
endpoint won't be reachable in practice without a registered token, so
the guard is cosmetic.
"""
from __future__ import annotations

import logging
from typing import Final

from aiogram import Bot
from aiogram.types import Update
from fastapi import FastAPI, Header, HTTPException, Request

from . import Channel, InboundCallback, InboundMessage, OutboundMessage

logger = logging.getLogger(__name__)

_CHANNEL: Final[Channel] = "telegram"


class TelegramDriver:
    def __init__(
        self,
        bot_token: str | None,
        webhook_secret: str | None = None,
    ) -> None:
        self._bot: Bot | None = None
        self._webhook_secret = webhook_secret
        self._callbacks: list[InboundCallback] = []
        if bot_token is not None:
            self._bot = Bot(token=bot_token)
        else:
            logger.warning("telegram driver disabled — TELEGRAM_BOT_TOKEN unset")

    @property
    def channel(self) -> Channel:
        return _CHANNEL

    async def send(self, message: OutboundMessage) -> str:
        if message.channel != _CHANNEL:
            raise ValueError(
                f"TelegramDriver received message for channel {message.channel!r}"
            )
        bot = self._bot
        if bot is None:
            logger.warning(
                "telegram send skipped — driver disabled",
                extra={"recipient_id": message.recipient_id},
            )
            return ""
        result = await bot.send_message(
            chat_id=int(message.recipient_id),
            text=message.body,
        )
        return str(result.message_id)

    def on_receive(self, callback: InboundCallback) -> None:
        self._callbacks.append(callback)

    async def process_update(
        self,
        update_data: dict[str, object],
        *,
        secret_token: str | None = None,
    ) -> None:
        """Parse a Telegram webhook payload and fire registered callbacks."""
        if self._webhook_secret and secret_token != self._webhook_secret:
            raise PermissionError("invalid webhook secret")
        update = Update.model_validate(update_data)
        msg = update.message or update.channel_post
        if msg is None:
            return
        inbound = InboundMessage(
            channel=_CHANNEL,
            sender_id=str(msg.chat.id),
            body=msg.text or "",
            external_message_id=str(msg.message_id),
        )
        for callback in self._callbacks:
            await callback(inbound)


_driver: TelegramDriver | None = None


def get_telegram_driver() -> TelegramDriver:
    """Return the process-singleton Telegram driver, instantiating on first use."""
    global _driver
    if _driver is None:
        from ..config import get_settings

        s = get_settings()
        _driver = TelegramDriver(
            bot_token=s.telegram_bot_token,
            webhook_secret=s.telegram_webhook_secret,
        )
    return _driver


def reset_telegram_driver() -> None:
    """Test helper — drop the singleton so the next get_telegram_driver() rebuilds."""
    global _driver
    _driver = None


def mount_telegram_driver(app: FastAPI) -> TelegramDriver:
    """Register the `/v1/webhook/telegram` endpoint on `app` and return the driver."""

    @app.post("/v1/webhook/telegram", status_code=200)
    async def telegram_webhook(
        request: Request,
        x_telegram_bot_api_secret_token: str | None = Header(default=None),
    ) -> dict[str, str]:
        driver = get_telegram_driver()
        body: dict[str, object] = await request.json()
        try:
            await driver.process_update(body, secret_token=x_telegram_bot_api_secret_token)
        except PermissionError:
            raise HTTPException(status_code=403, detail="invalid webhook secret")
        return {"ok": "true"}

    return get_telegram_driver()
