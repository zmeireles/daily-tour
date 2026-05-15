import logging
import os
from dataclasses import dataclass

import structlog

logger = structlog.get_logger(__name__)

_initialized = False


@dataclass
class OtelConfig:
    service_name: str
    service_version: str = "0.0.0"
    deployment_environment: str = "development"
    trace_endpoint: str | None = None
    metrics_endpoint: str | None = None
    log_level: str = "INFO"


def _resolve_trace_endpoint() -> str | None:
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    if endpoint:
        return endpoint
    if os.environ.get("PYTHON_ENV") == "test":
        return None
    return "http://localhost:4318"


def _build_config(service_name: str, **overrides: object) -> OtelConfig:
    cfg = OtelConfig(
        service_name=overrides.pop("service_name", service_name),  # type: ignore[arg-type]
        service_version=overrides.pop(  # type: ignore[arg-type]
            "service_version", os.environ.get("OTEL_SERVICE_VERSION", "0.0.0")
        ),
        deployment_environment=overrides.pop(  # type: ignore[arg-type]
            "deployment_environment",
            os.environ.get("OTEL_DEPLOYMENT_ENVIRONMENT", "development"),
        ),
        trace_endpoint=overrides.pop("trace_endpoint", _resolve_trace_endpoint()),  # type: ignore[arg-type]
        metrics_endpoint=overrides.pop(  # type: ignore[arg-type]
            "metrics_endpoint",
            os.environ.get("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"),
        ),
        log_level=overrides.pop("log_level", os.environ.get("OTEL_LOG_LEVEL", "INFO")),  # type: ignore[arg-type]
    )
    return cfg


def init_otel(service_name: str, **overrides: object) -> None:
    global _initialized
    if _initialized:
        logging.getLogger(__name__).warning(
            "[daily-tour-common] init_otel() called more than once — ignoring."
        )
        return
    _initialized = True

    cfg = _build_config(service_name, **overrides)

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.semconv.resource import ResourceAttributes
    except ImportError:
        logging.getLogger(__name__).warning("opentelemetry-sdk not available; skipping OTel init.")
        return

    resource = Resource(
        attributes={
            ResourceAttributes.SERVICE_NAME: cfg.service_name,
            ResourceAttributes.SERVICE_VERSION: cfg.service_version,
            "deployment.environment": cfg.deployment_environment,
        }
    )

    tracer_provider = TracerProvider(resource=resource)

    if cfg.trace_endpoint is not None:
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

            exporter = OTLPSpanExporter(endpoint=f"{cfg.trace_endpoint}/v1/traces")
            tracer_provider.add_span_processor(BatchSpanProcessor(exporter))
        except ImportError:
            logging.getLogger(__name__).warning("OTLP trace exporter not available.")

    trace.set_tracer_provider(tracer_provider)

    if cfg.metrics_endpoint is not None:
        try:
            from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
            from opentelemetry.metrics import set_meter_provider
            from opentelemetry.sdk.metrics import MeterProvider
            from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

            metric_exporter = OTLPMetricExporter(
                endpoint=f"{cfg.metrics_endpoint}/v1/metrics"
            )
            reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=30_000)
            meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
            set_meter_provider(meter_provider)
        except ImportError:
            logging.getLogger(__name__).warning("OTLP metric exporter not available.")

    _instrument_libraries()


def _instrument_libraries() -> None:
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor().instrument()
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.asgi import OpenTelemetryMiddleware  # noqa: F401
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        HTTPXClientInstrumentor().instrument()
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
        AsyncPGInstrumentor().instrument()  # type: ignore[no-untyped-call]
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.aio_pika import AioPikaInstrumentor
        AioPikaInstrumentor().instrument()
    except ImportError:
        pass
