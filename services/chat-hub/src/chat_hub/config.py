from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    service_name: str = "chat-hub"
    host: str = "0.0.0.0"  # noqa: S104 — container bind
    port: int = 8084
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # Deny-by-default gate for every route (dt-tests #44/#45). No default and a
    # 32-char floor, so the service CANNOT BOOT without a real token — the same
    # posture as catalog-svc's `z.string().min(32)`. A default here would be a
    # gate that silently admits everyone in any environment that forgot the var.
    internal_token: str = Field(min_length=32, validation_alias="CHAT_HUB_INTERNAL_TOKEN")

    database_url: str = (
        "postgresql://chat_svc:change-me-please-chat"
        "@dt_postgres:5432/dailytour"
    )
    rabbitmq_url: str = (
        "amqp://dailytour:change-me-please-rabbit@dt_rabbitmq:5672/"
    )

    otel_service_name: str = "chat-hub"
    otel_exporter_otlp_endpoint: str | None = None

    # Driver credentials (T-4.2 / T-4.3 / T-5.6). Leave unset in dev/CI —
    # the corresponding driver short-circuits with a warning rather than
    # failing health checks (same posture as planner-svc's ANTHROPIC_API_KEY).
    telegram_bot_token: str | None = None
    telegram_webhook_secret: str | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_access_token: str | None = None
    # Arbitrary string returned to Meta during webhook registration (GET challenge).
    # Generate: openssl rand -hex 16
    whatsapp_verify_token: str | None = None
    # App secret from Meta developer console — used to verify X-Hub-Signature-256.
    # Leave unset to skip HMAC verification (not recommended in production).
    whatsapp_app_secret: str | None = None

    # Anthropic Messages API (T-4.4.0 — AI reservation drafter).
    # When ANTHROPIC_API_KEY is unset, the drafter returns a deterministic
    # fallback so dev/CI bring chat-hub up without a real key (mirrors
    # planner-svc).
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_max_tokens: int = 1024
    anthropic_request_timeout_seconds: float = 30.0

    @field_validator(
        "otel_exporter_otlp_endpoint",
        "telegram_bot_token",
        "telegram_webhook_secret",
        "whatsapp_phone_number_id",
        "whatsapp_access_token",
        "whatsapp_verify_token",
        "whatsapp_app_secret",
        "anthropic_api_key",
        mode="before",
    )
    @classmethod
    def _blank_to_none(cls, value: object) -> object:
        # docker-compose passes optional credentials as `VAR=${VAR:-}` → an
        # empty string when unset in .env. The drivers treat None as "disabled"
        # (the documented "leave blank in dev" posture), but a blank string is
        # not None: aiogram's Bot("") raises TokenValidationError and crashes
        # startup. Coerce blank → None so blank genuinely means disabled.
        if isinstance(value, str) and value.strip() == "":
            return None
        return value


_cached: Settings | None = None


def get_settings() -> Settings:
    global _cached
    if _cached is None:
        _cached = Settings()
    return _cached


def reset_settings_cache() -> None:
    global _cached
    _cached = None
