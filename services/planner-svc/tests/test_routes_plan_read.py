"""dt-tests #42 — the two read routes, one per audience.

The repository tests pin the WHERE clauses; these pin that each route calls the
right one and passes the caller's identity through. The DB is replaced with a
no-op scope, so nothing here touches Postgres — the same constraint every other
test in this service works under.

Each test discriminates. Against the pre-#42 code the route ignored `guest_id`
and served the row regardless, so `test_a_plan_owned_by_another_guest_404s`
would have returned 200; and the param had no existence at all, so
`test_guest_id_is_required` would have returned 200 rather than 422.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from types import SimpleNamespace
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from planner_svc.main import app
from planner_svc.routes import plans

OWNER = uuid4()
STRANGER = uuid4()
PLAN_ID = uuid4()


def _row(*, shared: bool = False) -> SimpleNamespace:
    return SimpleNamespace(
        id=PLAN_ID,
        status="ready",
        plan_payload={"steps": []},
        shared_at="2026-08-25T09:00:00+00:00" if shared else None,
    )


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """A client whose repository layer is real in shape, fake in storage.

    `get_owned` / `get_shared` here reproduce the WHERE clauses the repository
    builds — the predicate is applied, not assumed — so a route that dropped
    the identity it passes would fail these even though no DB is involved.
    """

    @asynccontextmanager
    async def _scope() -> AsyncIterator[object]:
        yield object()

    async def _get_owned(_session: Any, plan_id: UUID, *, guest_id: UUID) -> Any:
        return _row() if plan_id == PLAN_ID and guest_id == OWNER else None

    async def _get_shared(_session: Any, plan_id: UUID) -> Any:
        return _row(shared=True) if plan_id == PLAN_ID else None

    monkeypatch.setattr(plans, "session_scope", _scope)
    monkeypatch.setattr(plans, "get_owned", _get_owned)
    monkeypatch.setattr(plans, "get_shared", _get_shared)
    return TestClient(app)


def test_the_owner_reads_their_own_plan(client: TestClient) -> None:
    """Passes before and after the fix — it is the control, not the evidence."""
    resp = client.get(f"/v1/tour-plans/{PLAN_ID}", params={"guest_id": str(OWNER)})

    assert resp.status_code == 200
    assert resp.json()["id"] == str(PLAN_ID)


def test_a_plan_owned_by_another_guest_404s(client: TestClient) -> None:
    """The card. 404 rather than 403, so the id cannot be confirmed to exist."""
    resp = client.get(f"/v1/tour-plans/{PLAN_ID}", params={"guest_id": str(STRANGER)})

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


def test_a_missing_plan_answers_exactly_like_a_stranger_s_plan(client: TestClient) -> None:
    """Both 404 with the same body — otherwise the pair leaks which ids exist."""
    stranger = client.get(f"/v1/tour-plans/{PLAN_ID}", params={"guest_id": str(STRANGER)})
    absent = client.get(f"/v1/tour-plans/{uuid4()}", params={"guest_id": str(OWNER)})

    assert (stranger.status_code, stranger.json()) == (absent.status_code, absent.json())


def test_guest_id_is_required(client: TestClient) -> None:
    """No default means no unscoped read by omission — a 422, never a plan.

    This is what makes the fix hold for the NEXT caller as well as this one.
    """
    resp = client.get(f"/v1/tour-plans/{PLAN_ID}")

    assert resp.status_code == 422


def test_the_public_route_needs_no_identity(client: TestClient) -> None:
    resp = client.get(f"/v1/public/tour-plans/{PLAN_ID}")

    assert resp.status_code == 200
    assert resp.json()["id"] == str(PLAN_ID)


def test_the_public_route_404s_an_unshared_plan(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """`get_shared` finds nothing when the grant is absent; the route must 404."""

    async def _none(_session: Any, _plan_id: UUID) -> Any:
        return None

    monkeypatch.setattr(plans, "get_shared", _none)
    resp = client.get(f"/v1/public/tour-plans/{PLAN_ID}")

    assert resp.status_code == 404
