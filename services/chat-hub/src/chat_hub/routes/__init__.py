"""Aggregate router exports. `main.py` mounts everything imported here."""
from .health import router as health_router

__all__ = ["health_router"]
