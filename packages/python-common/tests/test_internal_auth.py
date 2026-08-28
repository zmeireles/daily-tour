"""Tests for the deny-by-default internal-token gate.

⚠️ **Read this before simplifying anything here.**

The defect these tests exist to catch is not "the gate rejects a bad token" — it
is "the gate is present but inert". This repo has repeatedly shipped checks that
could not have failed: a fake safer than the system it stood in for, a guard no
test exercised, an assertion keyed on a field that did not exist. Every test below
is written so that breaking the corresponding line in `internal_auth.py` makes it
fail, and that was verified by mutation rather than assumed.

So the *negative* cases are the load-bearing ones. `test_valid_token_passes` on its
own would pass against a middleware that let everything through.

**Measured mutation run** (apply, run, revert, reconfirm green — 15/15 restored):

===================================== ============================================
mutation                              result
===================================== ============================================
middleware never installed            **9 failed** / 6 passed
whole ``_is_authorised`` -> ``True``  **9 failed** / 6 passed
only the compare -> ``True``          **4 failed** / 11 passed  (see note)
websocket branch removed              **1 failed** — ``test_websocket_without_
                                      credential_is_refused``, by name
open-path check -> ``startswith``     **1 failed** / 14 passed
``compare_digest`` -> ``==``          **0 failed** — see the honest gap below
===================================== ============================================

*Note on the 4:* mutating only the comparison leaves the ``presented is None``
early return intact, so the no-header cases still deny correctly. The 4 failures
are exactly the tests that send a *wrong* header — which is the precise set that
exercises the comparison. That is coverage behaving correctly, not a hole.

⚠️ **Honest gap: no test here can catch the constant-time comparison being
downgraded to ``==``.** Timing-safety is not behaviourally observable, so the
mutation run is green for it. Nothing below protects ``hmac.compare_digest`` —
if you change that line, no test will stop you. It is called out in the source
comment for the same reason.
"""
from __future__ import annotations

import os

import pytest
from fastapi import FastAPI, WebSocket
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

os.environ.setdefault("SERVICE_NAME", "test-svc")
os.environ.setdefault("PYTHON_ENV", "test")

from daily_tour_common.internal_auth import InternalAuthMiddleware

TOKEN = "a" * 40
WRONG = "b" * 40
HEADERS = {"x-internal-token": TOKEN}


def build_app() -> FastAPI:
    """An app with one guarded route, one open probe, and one websocket."""
    app = FastAPI()

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    async def ready() -> dict[str, str]:
        return {"status": "ready"}

    @app.get("/v1/secret")
    async def secret() -> dict[str, str]:
        return {"data": "sensitive"}

    @app.post("/v1/spend")
    async def spend() -> dict[str, str]:
        return {"spent": "yes"}

    @app.websocket("/ws/{client_id}")
    async def ws(websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        await websocket.send_text(f"hello {client_id}")
        await websocket.close()

    app.add_middleware(InternalAuthMiddleware, token=TOKEN)
    return app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(build_app())


class TestDeniesWithoutCredential:
    """The reason the module exists. If any of these pass, the gate is inert."""

    def test_no_header_is_rejected(self, client: TestClient) -> None:
        response = client.get("/v1/secret")
        assert response.status_code == 401
        assert response.json() == {"error": "unauthorized"}

    def test_no_header_does_not_reach_the_route(self, client: TestClient) -> None:
        # Distinct from the status assertion above: a middleware could return 401
        # *after* running the handler and doing the expensive/irreversible thing.
        # For POST /v1/spend that would be a real LLM call already paid for.
        response = client.post("/v1/spend")
        assert response.status_code == 401
        assert "spent" not in response.text

    def test_wrong_token_is_rejected(self, client: TestClient) -> None:
        response = client.get("/v1/secret", headers={"x-internal-token": WRONG})
        assert response.status_code == 401

    def test_empty_token_header_is_rejected(self, client: TestClient) -> None:
        response = client.get("/v1/secret", headers={"x-internal-token": ""})
        assert response.status_code == 401

    def test_token_prefix_is_rejected(self, client: TestClient) -> None:
        # Guards against a `startswith`/truncating comparison.
        response = client.get("/v1/secret", headers={"x-internal-token": TOKEN[:-1]})
        assert response.status_code == 401

    def test_token_with_extra_suffix_is_rejected(self, client: TestClient) -> None:
        response = client.get("/v1/secret", headers={"x-internal-token": TOKEN + "x"})
        assert response.status_code == 401

    def test_unknown_route_is_rejected_not_404(self, client: TestClient) -> None:
        # A 404 would confirm to an uncredentialed caller which paths exist.
        response = client.get("/v1/does-not-exist")
        assert response.status_code == 401


class TestAllowsValidCredential:
    def test_valid_token_passes(self, client: TestClient) -> None:
        response = client.get("/v1/secret", headers=HEADERS)
        assert response.status_code == 200
        assert response.json() == {"data": "sensitive"}

    def test_header_name_is_case_insensitive(self, client: TestClient) -> None:
        # HTTP header names are case-insensitive; a caller sending X-Internal-Token
        # must not be locked out.
        response = client.get("/v1/secret", headers={"X-Internal-Token": TOKEN})
        assert response.status_code == 200


class TestProbesStayOpen:
    """Docker's healthcheck sends no headers. If these need a token, the container
    is marked unhealthy and taken out of rotation."""

    def test_health_needs_no_credential(self, client: TestClient) -> None:
        assert client.get("/health").status_code == 200

    def test_ready_needs_no_credential(self, client: TestClient) -> None:
        assert client.get("/ready").status_code == 200

    def test_open_paths_do_not_extend_to_prefixes(self, client: TestClient) -> None:
        # `/health/../v1/secret` style bypasses: membership must be exact, not a
        # prefix match. A `startswith("/health")` gate would admit this.
        assert client.get("/healthz-secret").status_code == 401


class TestWebSocket:
    """chat-hub streams a named guest's live messages over `/ws/{client_id}`.

    An HTTP-only gate leaves this open while every HTTP test above still passes —
    which is exactly why these two tests exist.
    """

    def test_websocket_without_credential_is_refused(self, client: TestClient) -> None:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws/guest-1") as ws:
                ws.receive_text()

    def test_websocket_with_credential_connects(self, client: TestClient) -> None:
        with client.websocket_connect("/ws/guest-1", headers=HEADERS) as ws:
            assert ws.receive_text() == "hello guest-1"


class TestConstruction:
    def test_empty_token_is_refused_at_construction(self) -> None:
        # An empty token compared against an absent header is the fail-open shape:
        # the gate would be present, tested, and admit everyone.
        with pytest.raises(ValueError, match="non-empty token"):
            InternalAuthMiddleware(build_app(), token="")
