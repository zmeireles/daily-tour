from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    service_name: str = "search-svc"
    host: str = "0.0.0.0"  # noqa: S104 — container bind
    port: int = 8082
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    database_url: str = (
        "postgresql+asyncpg://search_svc:change-me-please-search"
        "@dt_postgres:5432/dailytour"
    )
    rabbitmq_url: str = (
        "amqp://dailytour:change-me-please-rabbit@dt_rabbitmq:5672/"
    )

    otel_service_name: str = "search-svc"
    otel_exporter_otlp_endpoint: str | None = None

    # Embeddings (T-2.0.1).
    # When EMBEDDING_API_KEY is unset, the worker logs a warning and skips the
    # upsert — this lets dev/CI bring the service up without a real key while
    # production gates on it. EMBEDDING_DIMENSIONS must match the migration's
    # vector(N) column (1024 today).
    embedding_api_key: str | None = None
    embedding_provider: Literal["openai", "voyage"] = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1024
    embedding_api_base_url: str = "https://api.openai.com/v1"
    embedding_request_timeout_seconds: float = 30.0
    embedding_max_retries: int = 3


_cached: Settings | None = None


def get_settings() -> Settings:
    global _cached
    if _cached is None:
        _cached = Settings()
    return _cached


def reset_settings_cache() -> None:
    global _cached
    _cached = None
