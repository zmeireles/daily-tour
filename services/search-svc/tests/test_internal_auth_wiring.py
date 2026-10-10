"""Proves the internal-token gate is actually WIRED INTO THIS SERVICE.

The middleware has its own thorough suite in `packages/python-common`. This file
answers a different question that suite structurally cannot: *is it installed
here?* Delete `app.add_middleware(InternalAuthMiddleware, ...)` from
`search_svc/main.py` and the shared suite stays green while this service serves every
route to anyone on the mesh. That gap is the whole reason this file exists.

Verified by mutation: removing the wiring makes the tests below fail.

The token is read from the environment rather than imported from `conftest`,
because the four services do not share a tests-directory layout — some have a
`tests/__init__.py` (making `tests` a package, so a bare `from conftest import ...`
does not resolve) and some do not. `conftest.py` sets the variable before any test
module is imported, so this works under both.
"""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

from search_svc.main import create_app

GUARDED = "/v1/query"
INTERNAL_HEADERS = {"x-internal-token": os.environ["SEARCH_SVC_INTERNAL_TOKEN"]}


def _client() -> TestClient:
    # `raise_server_exceptions=False` so a handler that cannot reach its database
    # in a unit-test environment surfaces as a 500 response instead of exploding
    # out of the client. This file asserts on *reachability*, never on the
    # handler's own success.
    return TestClient(create_app(), raise_server_exceptions=False)


class TestGateIsWired:
    def test_no_credential_is_rejected(self) -> None:
        response = _client().post(GUARDED)
        assert response.status_code == 401, (
            "the internal-token gate is not installed in this service"
        )
        assert response.json() == {"error": "unauthorized"}

    def test_wrong_credential_is_rejected(self) -> None:
        response = _client().post(GUARDED, headers={"x-internal-token": "wrong"})
        assert response.status_code == 401

    def test_valid_credential_reaches_the_route(self) -> None:
        # Deliberately not asserting 200: this route may need a database or a
        # well-formed body, and neither is this test's business. Anything other
        # than 401 proves the gate let the caller through, which is the claim.
        response = _client().post(GUARDED, headers=INTERNAL_HEADERS)
        assert response.status_code != 401


class TestProbesStayOpen:
    def test_health_needs_no_credential(self) -> None:
        # Docker's healthcheck sends no headers. If this ever needs a token, the
        # container is marked unhealthy and pulled from rotation.
        assert _client().get("/health").status_code == 200
