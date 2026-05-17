"""Unit tests for search_svc.repository.query SQL construction (T-2.2.0)."""
from __future__ import annotations

from search_svc.repository.query import (
    _CANDIDATE_CTE,
    _DISTANCE_SQL,
    _HOSTS_PICK_BOOST,
    _RERANK_SQL,
)


def test_candidate_cte_includes_is_hosts_pick() -> None:
    assert "p.is_hosts_pick" in _CANDIDATE_CTE


def test_distance_sql_orders_by_hosts_pick_first() -> None:
    assert "is_hosts_pick DESC" in _DISTANCE_SQL
    # hosts pick tie-breaker must come before distance
    pick_pos = _DISTANCE_SQL.index("is_hosts_pick DESC")
    dist_pos = _DISTANCE_SQL.index("distance_km ASC")
    assert pick_pos < dist_pos


def test_rerank_sql_applies_hosts_pick_boost() -> None:
    boost_str = str(_HOSTS_PICK_BOOST)
    assert "c.is_hosts_pick" in _RERANK_SQL
    assert boost_str in _RERANK_SQL


def test_hosts_pick_boost_value() -> None:
    assert _HOSTS_PICK_BOOST == 0.05
