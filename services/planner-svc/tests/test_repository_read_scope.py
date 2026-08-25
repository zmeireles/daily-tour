"""dt-tests #42 — the request-facing reads must carry their audience predicate.

Same approach and the same admitted limits as test_repository_share.py: there is
no Postgres in this service's CI job, so these capture the statement each
function builds and assert on the compiled SQL. That is enough to discriminate
the thing that matters — deleting the `guest_id` predicate from `get_owned`,
which is precisely the defect this card was filed for, turns these red.

What they deliberately do NOT claim: that the statements behave correctly
against a real database. That belongs to an integration test with a DB.
"""
from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest

from planner_svc.repository.plans import get_by_id, get_owned, get_shared


class _FakeResult:
    def scalar_one_or_none(self) -> None:
        return None


class _CapturingSession:
    """Records the statement instead of executing it."""

    def __init__(self) -> None:
        self.statements: list[Any] = []

    async def execute(self, stmt: Any) -> _FakeResult:
        self.statements.append(stmt)
        return _FakeResult()


def _sql(stmt: Any) -> str:
    # See test_repository_share.py for why the default compile is enough here.
    return str(stmt)


@pytest.mark.asyncio
async def test_owner_read_is_scoped_to_the_owning_guest() -> None:
    """The card itself: before this, any valid token read any plan by id."""
    session = _CapturingSession()
    await get_owned(session, uuid4(), guest_id=uuid4())  # type: ignore[arg-type]

    sql = _sql(session.statements[0])
    # Positive control: the id predicate is definitely there, so a miss on
    # guest_id below is a real absence and not a broken assertion.
    assert "tour_plan.id = " in sql
    assert "tour_plan.guest_id = " in sql, "a guest must not read another guest's plan"


@pytest.mark.asyncio
async def test_shared_read_gates_on_the_grant() -> None:
    session = _CapturingSession()
    await get_shared(session, uuid4())  # type: ignore[arg-type]

    sql = _sql(session.statements[0])
    assert "tour_plan.id = " in sql
    assert "tour_plan.shared_at IS NOT NULL" in sql, "an unshared plan must be unreachable"


@pytest.mark.asyncio
async def test_shared_read_carries_no_guest_predicate() -> None:
    """The public read is deliberately NOT guest-scoped — it has no caller.

    Pinned rather than left to be "tidied into symmetry" with `get_owned`
    later: adding a guest predicate here would break every shared link.
    """
    session = _CapturingSession()
    await get_shared(session, uuid4())  # type: ignore[arg-type]

    assert "tour_plan.guest_id = " not in _sql(session.statements[0])


@pytest.mark.asyncio
async def test_get_by_id_stays_unscoped_and_is_internal_only() -> None:
    """`get_by_id` is the worker's read and must keep serving any row.

    It is pinned here so the asymmetry is visible: this one is safe only
    because no route calls it. A route that does is dt-tests #42 again.
    """
    session = _CapturingSession()
    await get_by_id(session, uuid4())  # type: ignore[arg-type]

    sql = _sql(session.statements[0])
    assert "tour_plan.id = " in sql
    assert "tour_plan.guest_id = " not in sql
    assert "tour_plan.shared_at IS NOT NULL" not in sql
