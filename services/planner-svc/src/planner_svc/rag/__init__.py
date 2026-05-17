"""RAG retrieval for the planner — wraps search-svc /v1/query (T-3.0.1)."""
from __future__ import annotations

from .retriever import RetrievalError, RetrievedPlace, retrieve

__all__ = ["RetrievalError", "RetrievedPlace", "retrieve"]
