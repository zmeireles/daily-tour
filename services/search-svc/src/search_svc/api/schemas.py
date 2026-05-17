"""Pydantic request/response models for /v1/query (T-2.1.0)."""
from __future__ import annotations

from uuid import UUID

from daily_tour_common import Geom
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing_extensions import Annotated

# Action / wish slugs match the lowercased pattern enforced by catalog-svc
# (see daily_tour_common.models.common.Slug). We re-declare here rather than
# importing because pydantic + Annotated[Slug] needs a concrete constraint
# at class-define time and Slug is itself an Annotated alias.
SlugStr = Annotated[
    str,
    StringConstraints(pattern=r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$", min_length=1, max_length=64),
]


class QueryRequest(BaseModel):
    """POST /v1/query body.

    `action` is required (the user's "what do you wish to do" choice).
    `wish` narrows further within that action. `loc` + `km` set the SQL
    geo-filter ring. `free_text` is the optional natural-language clue
    used for the vector re-rank; when omitted, the wish slug stands in,
    and when both are absent the response is just distance-sorted.
    """

    model_config = ConfigDict(extra="forbid")

    action: SlugStr
    wish: SlugStr | None = None
    loc: Geom
    km: float = Field(default=20.0, ge=0.1, le=200.0)
    free_text: str | None = Field(default=None, max_length=512)
    limit: int = Field(default=30, ge=1, le=100)


class QueryResultItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    place_id: UUID
    distance_km: float
    # Cosine similarity in [0, 1]. None when no re-rank input was provided
    # (no free_text AND no wish, or the place has no embedding row yet).
    score: float | None = None


class QueryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: SlugStr
    wish: SlugStr | None = None
    count: int
    # True when we ran a vector re-rank (free_text or wish provided AND at least
    # one candidate had an embedding). False = distance-only ordering.
    reranked: bool
    results: list[QueryResultItem]
