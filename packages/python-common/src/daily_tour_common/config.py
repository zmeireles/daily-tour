from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    service_name: str
    service_version: str = "0.0.0"
    deployment_environment: str = "development"
    otel_exporter_otlp_endpoint: str | None = None
    otel_exporter_otlp_metrics_endpoint: str | None = None
    otel_log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    cors_allow_origins: list[str] = []
