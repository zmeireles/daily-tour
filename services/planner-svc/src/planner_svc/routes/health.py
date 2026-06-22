from fastapi import APIRouter, Response
from sqlalchemy import text

from ..db import session_scope
from ..version import __version__

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "planner-svc", "version": __version__}


@router.get("/ready")
async def ready(response: Response) -> dict[str, str]:
    # Readiness probe — checks ONLY this service's own Postgres (SELECT 1).
    # No downstream peers; the compose `--wait` gate uses this, so peer checks
    # would deadlock startup.
    try:
        async with session_scope() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready", "service": "planner-svc", "version": __version__}
    except Exception:
        response.status_code = 503
        return {"status": "not_ready", "service": "planner-svc", "reason": "db_unreachable"}
