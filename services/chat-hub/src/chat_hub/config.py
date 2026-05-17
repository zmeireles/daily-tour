from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    service_name: str = "chat-hub"
    host: str = "0.0.0.0"  # noqa: S104 — container bind
    port: int = 8084
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    database_url: str = (
        "postgresql://chat_svc:change-me-please-chat"
        "@dt_postgres:5432/dailytour"
    )
    rabbitmq_url: str = (
        "amqp://dailytour:change-me-please-rabbit@dt_rabbitmq:5672/"
    )

    otel_service_name: str = "chat-hub"
    otel_exporter_otlp_endpoint: str | None = None

    # Driver credentials (T-4.2 / T-4.3 fill in). Leave unset in dev/CI —
    # the corresponding driver short-circuits with a warning rather than
    # failing health checks (same posture as planner-svc's ANTHROPIC_API_KEY).
    telegram_bot_token: str | None = None
    telegram_webhook_secret: str | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_access_token: str | None = None

    # Anthropic Messages API (T-4.4.0 — AI reservation drafter).
    # When ANTHROPIC_API_KEY is unset, the drafter returns a deterministic
    # fallback so dev/CI bring chat-hub up without a real key (mirrors
    # planner-svc).
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_max_tokens: int = 1024
    anthropic_request_timeout_seconds: float = 30.0


_cached: Settings | None = None


def get_settings() -> Settings:
    global _cached
    if _cached is None:
        _cached = Settings()
    return _cached


def reset_settings_cache() -> None:
    global _cached
    _cached = None
