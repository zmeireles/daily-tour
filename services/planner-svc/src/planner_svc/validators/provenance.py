"""Provenance validator — every place_id the LLM returns must be in the RAG candidate set."""
from __future__ import annotations

from collections.abc import Set as AbstractSet
from uuid import UUID

from daily_tour_common import TourPlan


class ProvenanceError(ValueError):
    """Raised when the LLM returned a place_id absent from the RAG candidate set."""


def assert_provenance(plan: TourPlan, candidates: AbstractSet[UUID]) -> None:
    """Raise ProvenanceError for any step.place_id not present in candidates."""
    for step in plan.steps:
        if step.place_id not in candidates:
            raise ProvenanceError(
                f"place_id {step.place_id} was not in the RAG candidate set (hallucination?)"
            )


__all__ = ["ProvenanceError", "assert_provenance"]
