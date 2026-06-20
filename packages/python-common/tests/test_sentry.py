"""Tests for Sentry bootstrap — mocks the SDK, no network calls."""
from unittest.mock import patch

import pytest


def _reset_sentry_module() -> None:
    """Reset the _initialized flag so each test starts clean."""
    import daily_tour_common.sentry as sentry_mod
    sentry_mod._initialized = False


class TestInitSentry:
    def setup_method(self) -> None:
        _reset_sentry_module()

    def test_noop_when_dsn_unset(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("SENTRY_DSN", raising=False)

        with patch("sentry_sdk.init") as mock_init:
            from daily_tour_common.sentry import init_sentry
            enabled = init_sentry("svc-a")

        assert enabled is False
        mock_init.assert_not_called()

    def test_noop_when_dsn_empty(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SENTRY_DSN", "")

        with patch("sentry_sdk.init") as mock_init:
            from daily_tour_common.sentry import init_sentry
            enabled = init_sentry("svc-a")

        assert enabled is False
        mock_init.assert_not_called()

    def test_inits_sdk_when_dsn_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SENTRY_DSN", "https://abc@example.invalid/1")
        monkeypatch.setenv("OTEL_DEPLOYMENT_ENVIRONMENT", "qual")

        with patch("sentry_sdk.init") as mock_init, patch("sentry_sdk.set_tag") as mock_tag:
            from daily_tour_common.sentry import init_sentry
            enabled = init_sentry("chat-hub", release="1.2.3")

        assert enabled is True
        mock_init.assert_called_once()
        kwargs = mock_init.call_args.kwargs
        assert kwargs["dsn"] == "https://abc@example.invalid/1"
        assert kwargs["environment"] == "qual"
        assert kwargs["release"] == "1.2.3"
        mock_tag.assert_called_once_with("service", "chat-hub")

    def test_idempotent_second_call_is_noop(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SENTRY_DSN", "https://abc@example.invalid/1")

        with patch("sentry_sdk.init") as mock_init, patch("sentry_sdk.set_tag"):
            from daily_tour_common.sentry import init_sentry
            first = init_sentry("svc-a")
            second = init_sentry("svc-a")

        assert first is True
        assert second is False
        mock_init.assert_called_once()

    def test_release_falls_back_to_env_then_default(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("SENTRY_DSN", "https://abc@example.invalid/1")
        monkeypatch.delenv("SENTRY_SERVICE_VERSION", raising=False)

        with patch("sentry_sdk.init") as mock_init, patch("sentry_sdk.set_tag"):
            from daily_tour_common.sentry import init_sentry
            init_sentry("svc-a")

        assert mock_init.call_args.kwargs["release"] == "0.0.0"

    def test_returns_false_when_sentry_sdk_missing(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("SENTRY_DSN", "https://abc@example.invalid/1")

        # Simulate sentry-sdk not installed: the import inside init_sentry raises.
        import builtins

        real_import = builtins.__import__

        def fake_import(name: str, *args: object, **kwargs: object) -> object:
            if name == "sentry_sdk" or name.startswith("sentry_sdk."):
                raise ImportError("no sentry_sdk")
            return real_import(name, *args, **kwargs)  # type: ignore[arg-type]

        with patch.object(builtins, "__import__", side_effect=fake_import):
            from daily_tour_common.sentry import init_sentry
            enabled = init_sentry("svc-a")

        assert enabled is False
