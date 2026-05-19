"""SQL geo + tag filter ∩ pgvector cosine re-rank (T-2.1.0, T-2.2.0).

The hybrid query is one SQL round-trip:

1. INNER JOIN `catalog.place_action_wish` → `catalog.action` (and optionally
   `catalog.wish`) to filter by slug. `place.status = 'published'` is enforced.
2. Compute haversine distance in SQL (mirrors BFF `discover.ts`: R = 6371 km).
3. WHERE distance_km <= :km.
4. LEFT JOIN `search.place_embedding` so a missing embedding doesn't drop the
   row — we still want to return distance-matched places when their vector
   hasn't been backfilled yet (the worker is eventually consistent).
5. ORDER:
   - re-rank path (query_vec is not None): score DESC nulls last, distance ASC.
     Host's picks receive a +0.05 score boost on top of cosine similarity.
   - distance path: is_hosts_pick DESC, distance ASC (picks win ties).
   DISTINCT ON (place_id) keeps multi-wish places from duplicating in results.

The whole hybrid runs as one query rather than two (SQL-filter then vector
re-rank in a second pass) — pgvector's `<=>` is cheap for the <100-row
candidate set we expect at 28-place catalog scale, and one round-trip keeps
us well under the 250 ms p95 budget.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class QueryHit:
    place_id: UUID
    distance_km: float
    score: float | None


# Common CTE: pre-filter the candidate set by action/wish slug + haversine ring.
# `:wish_slug` is bound either to a slug or NULL — when NULL, the predicate is a
# no-op. The explicit `CAST(:wish_slug AS text)` is required: asyncpg's prepared-
# statement type inference can't disambiguate the parameter when it appears in
# both `IS NULL` (no type constraint) and `= text` (text-constrained) in the
# same statement (raises AmbiguousParameterError).
_CANDIDATE_CTE = """
WITH candidate AS (
    SELECT DISTINCT
        p.id AS place_id,
        p.is_hosts_pick,
        2 * 6371 * asin(sqrt(
            power(sin(radians(p.geom_lat - :lat) / 2), 2)
            + cos(radians(:lat)) * cos(radians(p.geom_lat))
              * power(sin(radians(p.geom_lng - :lng) / 2), 2)
        )) AS distance_km
    FROM catalog.place AS p
    JOIN catalog.place_action_wish AS paw ON paw.place_id = p.id
    JOIN catalog.action AS a ON a.id = paw.action_id
    LEFT JOIN catalog.wish AS w ON w.id = paw.wish_id
    WHERE p.status = 'published'
      AND a.slug = :action_slug
      AND (CAST(:wish_slug AS text) IS NULL OR w.slug = CAST(:wish_slug AS text))
)
"""

_DISTANCE_SQL = (
    _CANDIDATE_CTE
    + """
SELECT place_id, distance_km, NULL::float AS score
FROM candidate
WHERE distance_km <= :km
ORDER BY is_hosts_pick DESC, distance_km ASC
LIMIT :limit
"""
)

# Re-rank: cast the bound parameter to vector at the SQL boundary. asyncpg /
# the pgvector python adapter both expect a list[float] here; the explicit
# `::vector` cast is what lets pgvector pick the HNSW index for `<=>`.
_HOSTS_PICK_BOOST = 0.05

_RERANK_SQL = (
    _CANDIDATE_CTE
    + """
SELECT
    c.place_id,
    c.distance_km,
    CASE
        WHEN e.vec IS NULL THEN NULL
        ELSE 1 - (e.vec <=> CAST(:query_vec AS vector))
             + CASE WHEN c.is_hosts_pick THEN 0.05 ELSE 0.0 END
    END AS score
FROM candidate AS c
LEFT JOIN search.place_embedding AS e ON e.place_id = c.place_id
WHERE c.distance_km <= :km
ORDER BY score DESC NULLS LAST, c.distance_km ASC
LIMIT :limit
"""
)


async def query_places(
    session: AsyncSession,
    *,
    action_slug: str,
    wish_slug: str | None,
    lat: float,
    lng: float,
    km: float,
    query_vec: list[float] | None,
    limit: int,
) -> list[QueryHit]:
    """Run the hybrid query and return ranked hits.

    When `query_vec` is None we skip the embedding join entirely (cheaper,
    and avoids the `::vector` cast on a NULL parameter, which asyncpg can't
    infer a type for).
    """
    params: dict[str, object] = {
        "action_slug": action_slug,
        "wish_slug": wish_slug,
        "lat": lat,
        "lng": lng,
        "km": km,
        "limit": limit,
    }

    if query_vec is None:
        result = await session.execute(text(_DISTANCE_SQL), params)
    else:
        # pgvector's python adapter serialises list[float] → "[v1,v2,...]";
        # the SQL-side `::vector` cast then parses it.
        params["query_vec"] = _format_vector(query_vec)
        result = await session.execute(text(_RERANK_SQL), params)

    return [
        QueryHit(place_id=row.place_id, distance_km=float(row.distance_km), score=_score(row.score))
        for row in result
    ]


def _score(raw: object) -> float | None:
    if raw is None:
        return None
    return float(raw)  # type: ignore[arg-type]


def _format_vector(vec: list[float]) -> str:
    """Render a list[float] as a pgvector literal: `[v1,v2,...]`.

    pgvector accepts both literal strings and the python adapter type; the
    string form sidesteps the need to register the adapter on the connection
    and works identically across asyncpg / psycopg.
    """
    return "[" + ",".join(repr(float(v)) for v in vec) + "]"
