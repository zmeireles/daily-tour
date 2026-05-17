"""Reservation drafter unit tests — Anthropic SDK boundary mocked."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from chat_hub.config import Settings, reset_settings_cache
from chat_hub.drafting import DraftRequest, draft_reservation
from chat_hub.drafting.prompt_template import (
    build_system_prompt,
    build_user_prompt,
)
from chat_hub.main import app


def _mock_client(text: str) -> SimpleNamespace:
    response = SimpleNamespace(content=[SimpleNamespace(text=text)])
    return SimpleNamespace(
        messages=SimpleNamespace(create=AsyncMock(return_value=response))
    )


async def test_draft_reservation_en_calls_anthropic_with_english_prompt() -> None:
    settings = Settings(anthropic_api_key="sk-ant-test-key")
    client = _mock_client("Hi, table for 2 on 2026-06-12, please confirm.")
    request = DraftRequest(
        place_id="place_abc",
        place_name="Tasca do Chico",
        dates="2026-06-12 19:30",
        guest_message="We'd love a window seat.",
        party_size=2,
        locale="en",
    )

    result = await draft_reservation(settings=settings, request=request, client=client)

    assert result.source == "anthropic"
    assert result.locale == "en"
    assert result.text == "Hi, table for 2 on 2026-06-12, please confirm."

    client.messages.create.assert_awaited_once()
    kwargs = client.messages.create.await_args.kwargs
    assert kwargs["model"] == settings.anthropic_model
    assert kwargs["system"] == build_system_prompt("en")
    assert kwargs["messages"] == [
        {
            "role": "user",
            "content": build_user_prompt(
                place_name=request.place_name,
                dates=request.dates,
                party_size=request.party_size,
                guest_message=request.guest_message,
                locale="en",
            ),
        }
    ]


async def test_draft_reservation_pt_pt_uses_portuguese_system_prompt() -> None:
    settings = Settings(anthropic_api_key="sk-ant-test-key")
    client = _mock_client("Olá, gostaria de reservar mesa para 4...")
    request = DraftRequest(
        place_id="place_xyz",
        place_name="Cervejaria Ramiro",
        dates="2026-07-04 20:00",
        guest_message="Aniversário, se possível mesa tranquila.",
        party_size=4,
        locale="pt-PT",
    )

    result = await draft_reservation(settings=settings, request=request, client=client)

    assert result.source == "anthropic"
    assert result.locale == "pt-PT"

    kwargs = client.messages.create.await_args.kwargs
    assert kwargs["system"] == build_system_prompt("pt-PT")
    user_msg = kwargs["messages"][0]["content"]
    assert "Cervejaria Ramiro" in user_msg
    assert "Número de pessoas: 4" in user_msg


async def test_draft_reservation_falls_back_when_no_api_key() -> None:
    settings = Settings(anthropic_api_key=None)
    request = DraftRequest(
        place_id="place_abc",
        place_name="Tasca do Chico",
        dates="2026-06-12 19:30",
        guest_message="Window seat please.",
        party_size=2,
        locale="en",
    )

    result = await draft_reservation(settings=settings, request=request)

    assert result.source == "fallback"
    assert result.locale == "en"
    assert "Tasca do Chico" in result.text
    assert "2026-06-12 19:30" in result.text


def test_post_reservation_draft_route_returns_fallback_when_key_unset(
    monkeypatch,
) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    reset_settings_cache()

    client = TestClient(app)
    resp = client.post(
        "/v1/draft/reservation",
        json={
            "place_id": "place_abc",
            "place_name": "Tasca do Chico",
            "dates": "2026-06-12 19:30",
            "guest_message": "Window seat please.",
            "party_size": 2,
            "locale": "en",
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["source"] == "fallback"
    assert body["locale"] == "en"
    assert "Tasca do Chico" in body["text"]

    reset_settings_cache()
