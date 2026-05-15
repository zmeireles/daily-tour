"""Tests for OTel bootstrap — mocks the SDK, no network calls."""
from unittest.mock import MagicMock, patch

import pytest


def _reset_otel_module() -> None:
    """Reset the _initialized flag so each test starts clean."""
    import daily_tour_common.otel as otel_mod
    otel_mod._initialized = False


class TestOtelConfig:
    def test_defaults(self) -> None:
        from daily_tour_common.otel import OtelConfig
        cfg = OtelConfig(service_name="my-svc")
        assert cfg.service_name == "my-svc"
        assert cfg.service_version == "0.0.0"
        assert cfg.deployment_environment == "development"
        assert cfg.trace_endpoint is None  # PYTHON_ENV=test default
        assert cfg.metrics_endpoint is None

    def test_env_overrides(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("OTEL_SERVICE_VERSION", "1.2.3")
        monkeypatch.setenv("OTEL_DEPLOYMENT_ENVIRONMENT", "production")
        monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://collector:4318")
        monkeypatch.setenv("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT", "http://collector:4318")
        monkeypatch.delenv("PYTHON_ENV", raising=False)

        import daily_tour_common.otel as otel_mod
        cfg = otel_mod._build_config("env-svc")
        assert cfg.service_version == "1.2.3"
        assert cfg.deployment_environment == "production"
        assert cfg.trace_endpoint == "http://collector:4318"
        assert cfg.metrics_endpoint == "http://collector:4318"


class TestInitOtel:
    def setup_method(self) -> None:
        _reset_otel_module()

    def test_idempotent_second_call_is_noop(self) -> None:
        import daily_tour_common.otel as otel_mod

        call_count = 0
        real_build = otel_mod._build_config

        def counting_build(name: str, **kw: object) -> otel_mod.OtelConfig:
            nonlocal call_count
            call_count += 1
            cfg = real_build(name, **kw)
            cfg.trace_endpoint = None
            cfg.metrics_endpoint = None
            return cfg

        with patch.object(otel_mod, "_build_config", side_effect=counting_build):
            otel_mod.init_otel("svc-a")
            otel_mod.init_otel("svc-a")

        assert call_count == 1

    def test_no_metric_reader_when_endpoint_unset(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT", raising=False)
        monkeypatch.setenv("PYTHON_ENV", "test")

        mock_meter_provider = MagicMock()

        with (
            patch("opentelemetry.sdk.trace.TracerProvider"),
            patch("opentelemetry.trace.set_tracer_provider"),
            patch("opentelemetry.metrics.set_meter_provider", mock_meter_provider),
        ):
            from daily_tour_common.otel import init_otel
            init_otel("svc-b")

        mock_meter_provider.assert_not_called()

    def test_no_trace_exporter_in_test_env(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("PYTHON_ENV", "test")
        monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)

        with (
            patch("opentelemetry.sdk.trace.TracerProvider") as mock_tp,
            patch("opentelemetry.trace.set_tracer_provider"),
        ):
            mock_tp.return_value = MagicMock()
            from daily_tour_common.otel import init_otel
            init_otel("svc-c")

            provider_instance = mock_tp.return_value
            provider_instance.add_span_processor.assert_not_called()
