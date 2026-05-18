"""Smoke test: init_otel wires up without error in planner-svc."""
import daily_tour_common.otel as otel_mod
import pytest


def test_init_otel_smoke(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYTHON_ENV", "test")
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)
    otel_mod._initialized = False
    otel_mod.init_otel("planner-svc")
    assert otel_mod._initialized is True
    otel_mod._initialized = False
