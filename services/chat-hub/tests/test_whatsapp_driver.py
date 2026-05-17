"""WhatsApp driver tests — deep-link (T-4.3.0) + Cloud API + webhook (T-5.6.0)."""
from __future__ import annotations

import hashlib
import hmac as hmac_mod
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from chat_hub.drivers import InboundMessage, OutboundMessage
from chat_hub.drivers.whatsapp import WhatsAppDriver, build_wa_me_url, reset_whatsapp_driver
from chat_hub.main import create_app

# ─── deep-link (v1) ──────────────────────────────────────────────────────────


async def test_send_returns_wa_me_url() -> None:
    """send() returns a properly encoded wa.me deep-link for the recipient."""
    driver = WhatsAppDriver(phone_number_id=None, access_token=None)
    url = await driver.send(
        OutboundMessage(channel="whatsapp", recipient_id="15551234567", body="Hello World")
    )
    assert url == "https://wa.me/15551234567?text=Hello%20World"


async def test_draft_endpoint_returns_url() -> None:
    """GET /v1/chat/whatsapp/draft returns {url: <wa.me link>}."""
    reset_whatsapp_driver()
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


# ─── Cloud API send ───────────────────────────────────────────────────────────


async def test_send_via_cloud_api_returns_message_id() -> None:
    """send() POSTs to the Graph API and returns the Cloud API message ID."""
    driver = WhatsAppDriver(phone_number_id="12345", access_token="test-token")

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"messages": [{"id": "wamid.abc123"}]}

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.post.return_value = mock_resp

    with patch("chat_hub.drivers.whatsapp.httpx.AsyncClient", return_value=mock_client):
        result = await driver.send(
            OutboundMessage(channel="whatsapp", recipient_id="15559876543", body="Cloud hi")
        )

    assert result == "wamid.abc123"
    mock_client.post.assert_called_once()
    _, kwargs = mock_client.post.call_args
    assert kwargs["json"]["to"] == "15559876543"
    assert kwargs["json"]["text"]["body"] == "Cloud hi"
    assert "Bearer test-token" in kwargs["headers"]["Authorization"]


# ─── webhook verification challenge ──────────────────────────────────────────


async def test_webhook_verify_challenge_success() -> None:
    """GET /v1/webhook/whatsapp echoes hub.challenge when verify token matches."""
    reset_whatsapp_driver()
    driver = WhatsAppDriver(phone_number_id=None, access_token=None, verify_token="my-secret")
    app = create_app()
    with patch("chat_hub.drivers.whatsapp.get_whatsapp_driver", return_value=driver):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/v1/webhook/whatsapp",
                params={
                    "hub.mode": "subscribe",
                    "hub.challenge": "abc999",
                    "hub.verify_token": "my-secret",
                },
            )
    assert resp.status_code == 200
    assert resp.text == "abc999"


async def test_webhook_verify_challenge_wrong_token() -> None:
    """GET /v1/webhook/whatsapp returns 403 when verify token does not match."""
    reset_whatsapp_driver()
    driver = WhatsAppDriver(phone_number_id=None, access_token=None, verify_token="correct")
    app = create_app()
    with patch("chat_hub.drivers.whatsapp.get_whatsapp_driver", return_value=driver):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/v1/webhook/whatsapp",
                params={
                    "hub.mode": "subscribe",
                    "hub.challenge": "xyz",
                    "hub.verify_token": "wrong",
                },
            )
    assert resp.status_code == 403


async def test_webhook_verify_bad_mode() -> None:
    """GET /v1/webhook/whatsapp returns 400 for unknown hub.mode values."""
    reset_whatsapp_driver()
    driver = WhatsAppDriver(phone_number_id=None, access_token=None, verify_token="tok")
    app = create_app()
    with patch("chat_hub.drivers.whatsapp.get_whatsapp_driver", return_value=driver):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/v1/webhook/whatsapp",
                params={"hub.mode": "unsubscribe", "hub.challenge": "c", "hub.verify_token": "tok"},
            )
    assert resp.status_code == 400


# ─── webhook inbound receive ──────────────────────────────────────────────────


async def test_webhook_receive_fires_callback() -> None:
    """POST /v1/webhook/whatsapp parses the payload and invokes on_receive callbacks."""
    reset_whatsapp_driver()
    app_secret = "test-app-secret"
    driver = WhatsAppDriver(phone_number_id=None, access_token=None, app_secret=app_secret)
    received: list[InboundMessage] = []

    async def capture(msg: InboundMessage) -> None:
        received.append(msg)

    driver.on_receive(capture)

    payload_bytes = json.dumps({
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "id": "wamid.1",
                        "from": "15551234567",
                        "text": {"body": "Hey there"},
                    }]
                }
            }]
        }],
    }).encode()
    sig = "sha256=" + hmac_mod.new(
        app_secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()

    app = create_app()
    with patch("chat_hub.drivers.whatsapp.get_whatsapp_driver", return_value=driver):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/v1/webhook/whatsapp",
                content=payload_bytes,
                headers={"x-hub-signature-256": sig, "content-type": "application/json"},
            )

    assert resp.status_code == 200
    assert len(received) == 1
    assert received[0].channel == "whatsapp"
    assert received[0].sender_id == "15551234567"
    assert received[0].body == "Hey there"
    assert received[0].external_message_id == "wamid.1"


async def test_webhook_receive_rejects_bad_signature() -> None:
    """POST /v1/webhook/whatsapp returns 403 when X-Hub-Signature-256 is invalid."""
    reset_whatsapp_driver()
    driver = WhatsAppDriver(phone_number_id=None, access_token=None, app_secret="real-secret")
    app = create_app()
    with patch("chat_hub.drivers.whatsapp.get_whatsapp_driver", return_value=driver):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/v1/webhook/whatsapp",
                content=b'{"entry": []}',
                headers={
                    "x-hub-signature-256": "sha256=badhash",
                    "content-type": "application/json",
                },
            )
    assert resp.status_code == 403
