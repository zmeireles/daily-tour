"""count_messages_windowed — bucketing + SQL-shape guard (no live DB).

The route tests override the count provider, so the repository's SQL never runs
in CI. This exercises the real function against a fake session: the
current/previous bucketing loop, and that the statement it builds compiles to
valid Postgres SQL — guarding the "labeled-CASE GROUP BY only fails at execution
time" blind spot. Mirrors the repo's SQL-shape/unit posture (no CI Postgres;
full execution verified out-of-band).
"""
from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from sqlalchemy.dialects import postgresql

from chat_hub.repository.messages import count_messages_windowed


class _CapturingSession:
    """Records the executed statement and returns fixed rows (no DB)."""

    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows
        self.stmt: Any = None

    async def execute(self, stmt: Any) -> Any:
        self.stmt = stmt
        return iter(self._rows)


async def test_buckets_rows_into_current_and_previous() -> None:
    session = _CapturingSession(
        [SimpleNamespace(period="current", cnt=5), SimpleNamespace(period="previous", cnt=3)]
    )
    assert await count_messages_windowed(session, range_days=30) == (5, 3)  # type: ignore[arg-type]


async def test_empty_result_is_zero_zero() -> None:
    session = _CapturingSession([])
    assert await count_messages_windowed(session, range_days=7) == (0, 0)  # type: ignore[arg-type]


async def test_statement_compiles_to_valid_postgres_sql() -> None:
    session = _CapturingSession([])
    await count_messages_windowed(session, range_days=30)  # type: ignore[arg-type]
    assert session.stmt is not None
    sql = str(session.stmt.compile(dialect=postgresql.dialect())).lower()
    assert "group by" in sql
    assert "count(" in sql
    # The GROUP BY re-renders the CASE (not a bare alias Postgres could reject),
    # so CASE appears in both the SELECT list and the GROUP BY clause.
    assert sql.count("case") >= 2
    # Guest-demand KPI: only inbound messages are counted (host replies excluded).
    assert "direction" in sql
