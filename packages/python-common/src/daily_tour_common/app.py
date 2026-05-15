import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .logging import configure_logging
from .version import __version__


def create_app(service_name: str) -> FastAPI:
    settings = Settings(service_name=service_name)

    app = FastAPI(title=service_name, version=__version__)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": service_name, "version": __version__}

    @app.on_event("startup")
    async def startup() -> None:
        configure_logging(settings.otel_log_level)
        try:
            from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

            if FastAPIInstrumentor().is_instrumented_by_opentelemetry:
                FastAPIInstrumentor().instrument_app(app)
        except Exception:
            logging.getLogger(__name__).warning(
                "OTel SDK not initialised; skipping FastAPI instrumentation."
            )

    return app
