"""Readiness endpoint tests — /ready 503s on own-DB failure, 200s when reachable."""
from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

import chat_hub.routes.health as health
from chat_hub.main import app
from chat_hub.version import __version__


class _FakeSession:
    async def execute(self, _statement: object) -> None:
        return None


@asynccontextmanager
async def _ok_scope() -> AsyncIterator[_FakeSession]:
    yield _FakeSession()


@asynccontextmanager
async def _broken_scope() -> AsyncIterator[_FakeSession]:
    raise RuntimeError("db_unreachable")
    yield _FakeSession()  # pragma: no cover - unreachable, satisfies generator typing


def test_ready_returns_200_when_db_reachable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(health, "session_scope", _ok_scope)
    resp = TestClient(app).get("/ready")
    assert resp.status_code == 200
    assert resp.json() == {
        "status": "ready",
        "service": "chat-hub",
        "version": __version__,
    }


def test_ready_returns_503_when_db_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(health, "session_scope", _broken_scope)
    resp = TestClient(app).get("/ready")
    assert resp.status_code == 503
    assert resp.json() == {
        "status": "not_ready",
        "service": "chat-hub",
        "reason": "db_unreachable",
    }
