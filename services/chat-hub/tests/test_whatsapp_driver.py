"""WhatsApp deep-link driver tests (T-4.3.0)."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from chat_hub.drivers import OutboundMessage
from chat_hub.drivers.whatsapp import WhatsAppDriver, build_wa_me_url
from chat_hub.main import create_app


async def test_send_returns_wa_me_url() -> None:
    """send() returns a properly encoded wa.me deep-link for the recipient."""
    driver = WhatsAppDriver(phone_number_id=None, access_token=None)
    url = await driver.send(
        OutboundMessage(channel="whatsapp", recipient_id="15551234567", body="Hello World")
    )
    assert url == "https://wa.me/15551234567?text=Hello%20World"


async def test_draft_endpoint_returns_url() -> None:
    """GET /v1/chat/whatsapp/draft returns {url: <wa.me link>}."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/v1/chat/whatsapp/draft",
            params={"phone": "15551234567", "text": "Hello World"},
        )
    assert resp.status_code == 200
    assert resp.json() == {"url": build_wa_me_url("15551234567", "Hello World")}
