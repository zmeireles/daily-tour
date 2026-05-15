"""Tests for the FastAPI app factory."""
import os

from fastapi.testclient import TestClient

os.environ.setdefault("SERVICE_NAME", "test-svc")
os.environ.setdefault("PYTHON_ENV", "test")

from daily_tour_common.app import create_app


class TestHealth:
    def test_returns_200(self) -> None:
        client = TestClient(create_app("test-svc"))
        response = client.get("/health")
        assert response.status_code == 200

    def test_payload_structure(self) -> None:
        client = TestClient(create_app("test-svc"))
        data = client.get("/health").json()
        assert data["status"] == "ok"
        assert data["service"] == "test-svc"
        assert "version" in data

    def test_second_create_app_is_independent(self) -> None:
        app1 = create_app("svc-one")
        app2 = create_app("svc-two")
        assert app1 is not app2
        assert TestClient(app1).get("/health").json()["service"] == "svc-one"
        assert TestClient(app2).get("/health").json()["service"] == "svc-two"
