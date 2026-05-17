"""Telegram driver — send / receive / webhook-secret tests (T-4.2.0)."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from chat_hub.drivers import InboundMessage, OutboundMessage
from chat_hub.drivers.telegram import TelegramDriver

# A syntactically valid fake token — aiogram validates format on API calls,
# not on Bot instantiation, so this lets us construct a live Bot without
# touching the network.
_FAKE_TOKEN = "123456789:AAHfakeTokenForTestingPurposes01234"

_SAMPLE_UPDATE: dict[str, object] = {
    "update_id": 1,
    "message": {
        "message_id": 99,
        "chat": {"id": 111222, "type": "private"},
        "from": {"id": 111222, "is_bot": False, "first_name": "Test"},
        "date": 1_700_000_000,
        "text": "hello from tg",
    },
}


async def test_send_delivers_message_and_returns_id() -> None:
    """send() calls Bot.send_message and returns the message_id as a string."""
    driver = TelegramDriver(bot_token=_FAKE_TOKEN)
    mock_result = MagicMock()
    mock_result.message_id = 42

    assert driver._bot is not None
    with patch.object(driver._bot, "send_message", new=AsyncMock(return_value=mock_result)):
        result = await driver.send(
            OutboundMessage(channel="telegram", recipient_id="111222", body="hello")
        )

    assert result == "42"


async def test_process_update_fires_callback() -> None:
    """process_update() parses a Telegram update and invokes all on_receive callbacks."""
    driver = TelegramDriver(bot_token=None)
    received: list[InboundMessage] = []

    async def capture(msg: InboundMessage) -> None:
        received.append(msg)

    driver.on_receive(capture)
    await driver.process_update(_SAMPLE_UPDATE)

    assert len(received) == 1
    msg = received[0]
    assert msg.channel == "telegram"
    assert msg.sender_id == "111222"
    assert msg.body == "hello from tg"
    assert msg.external_message_id == "99"


async def test_process_update_rejects_wrong_secret() -> None:
    """process_update() raises PermissionError when the secret token doesn't match."""
    driver = TelegramDriver(bot_token=None, webhook_secret="correct-secret")

    with pytest.raises(PermissionError, match="invalid webhook secret"):
        await driver.process_update(_SAMPLE_UPDATE, secret_token="wrong-secret")
