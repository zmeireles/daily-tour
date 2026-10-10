from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    service_name: str = "planner-svc"
    host: str = "0.0.0.0"  # noqa: S104 — container bind
    port: int = 8083
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # Deny-by-default gate for every route (dt-tests #44/#45). No default and a
    # 32-char floor, so the service CANNOT BOOT without a real token — the same
    # posture as catalog-svc's `z.string().min(32)`. A default here would be a
    # gate that silently admits everyone in any environment that forgot the var.
    internal_token: str = Field(min_length=32, validation_alias="PLANNER_SVC_INTERNAL_TOKEN")

    database_url: str = (
        "postgresql://planner_svc:change-me-please-planner"
        "@dt_postgres:5432/dailytour"
    )
    rabbitmq_url: str = (
        "amqp://dailytour:change-me-please-rabbit@dt_rabbitmq:5672/"
    )

    # Redis — read-through cache for the IPMA weather forecast (slice C). The
    # forecast feeds the rainy-slot swap in workers.plan_worker.process_plan;
    # daily_tour_common.weather.get_forecast owns the cache key + 30-min TTL.
    redis_url: str = "redis://default:change-me-please-redis@dt_redis:6379/0"

    # Internal URL of the search-svc — planner uses it for RAG retrieval
    # (T-3.0.1 adds the actual /v1/query call; the skeleton just carries the URL).
    search_svc_url: str = "http://dt_search_svc:8082"

    # Token presented TO search-svc, which denies by default (dt-tests #44).
    # Distinct from `internal_token` above: that one authenticates callers coming
    # IN to planner-svc, this one authenticates planner-svc going OUT. Caller-side
    # posture matches the BFF's — a dev/CI default so local work is unaffected,
    # a real value injected in qual.
    search_svc_internal_token: str = (
        "change-me-please-search-svc-internal-token-min-32c"  # noqa: S105 — dev default, overridden in every deployment
    )

    osrm_url: str = "http://osrm-routed:5000"

    otel_service_name: str = "planner-svc"
    otel_exporter_otlp_endpoint: str | None = None

    # Anthropic Messages API (T-3.0.0).
    # When ANTHROPIC_API_KEY is unset, the LLM client warns and returns None
    # — this lets dev/CI bring the service up without a real key while
    # production gates on it (same posture as search-svc embeddings).
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_max_tokens: int = 4096
    anthropic_request_timeout_seconds: float = 60.0


_cached: Settings | None = None


def get_settings() -> Settings:
    global _cached
    if _cached is None:
        _cached = Settings()
    return _cached


def reset_settings_cache() -> None:
    global _cached
    _cached = None
