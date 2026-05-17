"""Driver Protocol + in-app WebSocket round-trip + stub posture (T-4.0.0)."""
from __future__ import annotations

import asyncio
import json

from fastapi.testclient import TestClient

from chat_hub.drivers import (
    InboundMessage,
    MessageDriver,
    OutboundMessage,
)
from chat_hub.drivers.in_app import get_in_app_driver
from chat_hub.drivers.telegram import TelegramDriver
from chat_hub.drivers.whatsapp import WhatsAppDriver
from chat_hub.main import app


def test_all_drivers_satisfy_protocol() -> None:
    in_app = get_in_app_driver()
    telegram = TelegramDriver(bot_token=None)
    whatsapp = WhatsAppDriver(phone_number_id=None, access_token=None)

    assert isinstance(in_app, MessageDriver)
    assert isinstance(telegram, MessageDriver)
    assert isinstance(whatsapp, MessageDriver)
    assert in_app.channel == "in_app"
    assert telegram.channel == "telegram"
    assert whatsapp.channel == "whatsapp"


def test_in_app_websocket_inbound_triggers_outbound() -> None:
    """End-to-end: inbound WS frame fires a callback that uses driver.send()
    to push a frame back over the same connection. Keeps all async work on
    the app's event loop (TestClient runs the app in a worker thread)."""
    driver = get_in_app_driver()
    received: list[InboundMessage] = []

    async def echo(msg: InboundMessage) -> None:
        received.append(msg)
        await driver.send(
            OutboundMessage(channel="in_app", recipient_id=msg.sender_id, body=f"ack:{msg.body}"),
        )

    driver.on_receive(echo)
    try:
        with TestClient(app) as client:
            with client.websocket_connect("/ws/guest-42") as ws:
                ws.send_text("ping")
                frame = ws.receive_text()
    finally:
        driver._callbacks.remove(echo)

    assert json.loads(frame) == {"body": "ack:ping"}
    assert len(received) == 1
    assert received[0].channel == "in_app"
    assert received[0].sender_id == "guest-42"
    assert received[0].body == "ping"


def test_stub_drivers_short_circuit_when_credentials_missing() -> None:
    telegram = TelegramDriver(bot_token=None)
    whatsapp = WhatsAppDriver(phone_number_id=None, access_token=None)

    # Telegram no-ops (no bot token); WhatsApp returns a wa.me deep-link
    # (credentials not required for v1 deep-link mode, D9 posture).
    tg_id = asyncio.run(
        telegram.send(OutboundMessage(channel="telegram", recipient_id="123", body="hi")),
    )
    wa_url = asyncio.run(
        whatsapp.send(OutboundMessage(channel="whatsapp", recipient_id="351911...", body="hi")),
    )
    assert tg_id == ""
    assert wa_url.startswith("https://wa.me/351911")
