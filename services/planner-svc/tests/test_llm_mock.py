"""LLM wrapper unit tests — boundary mocked, no network calls."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from planner_svc.config import Settings
from planner_svc.llm import build_client, generate


def test_build_client_returns_none_without_api_key() -> None:
    settings = Settings(anthropic_api_key=None)
    assert build_client(settings) is None


def test_build_client_constructs_when_key_present() -> None:
    settings = Settings(anthropic_api_key="sk-ant-test-key")
    client = build_client(settings)
    assert client is not None


async def test_generate_returns_none_without_api_key() -> None:
    settings = Settings(anthropic_api_key=None)
    result = await generate(settings=settings, system="sys", messages=[])
    assert result is None


async def test_generate_concatenates_text_blocks_from_mock_client() -> None:
    settings = Settings(anthropic_api_key="sk-ant-test-key")
    response = SimpleNamespace(
        content=[
            SimpleNamespace(text="Hello, "),
            SimpleNamespace(text="world!"),
        ]
    )
    mock_client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(return_value=response)))

    result = await generate(
        settings=settings,
        system="you are helpful",
        messages=[{"role": "user", "content": "hi"}],
        client=mock_client,  # type: ignore[arg-type]
    )

    assert result == "Hello, world!"
    mock_client.messages.create.assert_awaited_once_with(
        model=settings.anthropic_model,
        max_tokens=settings.anthropic_max_tokens,
        system="you are helpful",
        messages=[{"role": "user", "content": "hi"}],
    )


async def test_generate_raises_when_no_text_blocks() -> None:
    from planner_svc.llm import LLMError

    settings = Settings(anthropic_api_key="sk-ant-test-key")
    response = SimpleNamespace(content=[SimpleNamespace(text=None)])
    mock_client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(return_value=response)))

    with pytest.raises(LLMError):
        await generate(
            settings=settings,
            system="sys",
            messages=[{"role": "user", "content": "hi"}],
            client=mock_client,  # type: ignore[arg-type]
        )
