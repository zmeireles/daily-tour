from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    service_name: str = "notif-svc"
    host: str = "0.0.0.0"  # noqa: S104 — container bind
    port: int = 8085
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    otel_service_name: str = "notif-svc"
    otel_exporter_otlp_endpoint: str | None = None

    # SMTP connection URL. Schemes:
    #   smtp://         — plain/STARTTLS (auto-upgraded if server supports it)
    #   smtps://        — implicit TLS (port 465)
    #   smtp+starttls:// — force STARTTLS (port 587)
    # Dev default points at MailHog's SMTP port.
    smtp_url: str = "smtp://localhost:1025"
    smtp_from: str = "no-reply@daily-tour.example.local"


_cached: Settings | None = None


def get_settings() -> Settings:
    global _cached
    if _cached is None:
        _cached = Settings()
    return _cached


def reset_settings_cache() -> None:
    global _cached
    _cached = None
