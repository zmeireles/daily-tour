"""Aggregate router exports. `main.py` mounts everything imported here."""
from .draft import router as draft_router
from .health import router as health_router
from .history import router as history_router
from .reply import router as reply_router

__all__ = ["draft_router", "health_router", "history_router", "reply_router"]
