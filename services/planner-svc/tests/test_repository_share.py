"""dt-tests #40 — `set_shared` must scope its UPDATE to the owning guest.

There is no Postgres in this service's CI job, so these tests capture the
statement `set_shared` builds and assert on the compiled SQL. That is enough to
discriminate the thing that matters: deleting the `guest_id` predicate — which
would let any caller share or revoke any plan — turns these red.

What they deliberately do NOT claim: that the statement behaves correctly
against a real database. That belongs to an integration test with a DB.
"""
from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest

from planner_svc.repository.plans import set_shared


class _FakeResult:
    def __init__(self, rowcount: int) -> None:
        self.rowcount = rowcount


class _CapturingSession:
    """Records the statement instead of executing it."""

    def __init__(self, rowcount: int = 1) -> None:
        self.statements: list[Any] = []
        self._rowcount = rowcount

    async def execute(self, stmt: Any) -> _FakeResult:
        self.statements.append(stmt)
        return _FakeResult(self._rowcount)


def _sql(stmt: Any) -> str:
    # The default compile is enough: it renders the WHERE predicates with their
    # fully-qualified column names, which is all these assertions inspect. It
    # also avoids `postgresql.dialect()`, which is untyped in SQLAlchemy's stubs
    # and would need an ignore under `mypy src tests`.
    return str(stmt)


@pytest.mark.asyncio
async def test_share_is_scoped_to_the_owning_guest() -> None:
    session = _CapturingSession()
    await set_shared(session, uuid4(), guest_id=uuid4(), shared=True)  # type: ignore[arg-type]

    sql = _sql(session.statements[0])
    # Positive control: the id predicate is definitely there, so a miss on
    # guest_id below is a real absence and not a broken assertion.
    assert "tour_plan.id = " in sql
    assert "tour_plan.guest_id = " in sql, "share must not be possible across guests"


@pytest.mark.asyncio
async def test_revoke_is_also_scoped_to_the_owning_guest() -> None:
    session = _CapturingSession()
    await set_shared(session, uuid4(), guest_id=uuid4(), shared=False)  # type: ignore[arg-type]

    sql = _sql(session.statements[0])
    assert "tour_plan.guest_id = " in sql, "revoke must not be possible across guests"


@pytest.mark.asyncio
async def test_only_a_ready_plan_can_be_shared() -> None:
    session = _CapturingSession()
    await set_shared(session, uuid4(), guest_id=uuid4(), shared=True)  # type: ignore[arg-type]

    assert "tour_plan.status = " in _sql(session.statements[0])


@pytest.mark.asyncio
async def test_revoke_carries_no_status_guard() -> None:
    """A guest must be able to withdraw a link whatever state the plan is in.

    Contrast with the share path above — that asymmetry is deliberate, so it is
    pinned rather than left to be "tidied up" into symmetry later.
    """
    session = _CapturingSession()
    await set_shared(session, uuid4(), guest_id=uuid4(), shared=False)  # type: ignore[arg-type]

    assert "tour_plan.status = " not in _sql(session.statements[0])


@pytest.mark.asyncio
async def test_returns_false_when_no_row_matched() -> None:
    """A plan owned by someone else updates nothing; the route turns this into
    a 404 so the endpoint cannot be used to probe which plan ids exist."""
    session = _CapturingSession(rowcount=0)
    assert await set_shared(session, uuid4(), guest_id=uuid4(), shared=True) is False  # type: ignore[arg-type]

    session_ok = _CapturingSession(rowcount=1)
    assert await set_shared(session_ok, uuid4(), guest_id=uuid4(), shared=True) is True  # type: ignore[arg-type]
