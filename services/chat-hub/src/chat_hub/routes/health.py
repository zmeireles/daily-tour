from fastapi import APIRouter

from ..version import __version__

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "chat-hub", "version": __version__}
