"""Test bootstrapping.

`CHAT_HUB_INTERNAL_TOKEN` has no default and a 32-character floor, so the service
cannot construct its Settings without one — that is deliberate (dt-tests #44/#45):
a service that boots token-less is a service with an inert gate. Tests therefore
have to supply one, exactly as the deployment does.

This runs at import time, before any test module builds an app or reads settings.
"""
import os

#: Fixed, obviously-fake, and >= 32 chars. Exported so tests can send it as the
#: `x-internal-token` header when they need a request to be let through.
TEST_INTERNAL_TOKEN = "test-internal-token-0000000000000000"

os.environ.setdefault("CHAT_HUB_INTERNAL_TOKEN", TEST_INTERNAL_TOKEN)


#: Headers an internal caller presents. Route tests use these because they are
#: testing routes, not the gate — the gate has its own tests (see
#: `test_internal_auth_wiring.py` here, and the middleware's own suite in
#: packages/python-common). Deliberately NOT applied in test_health/test_ready:
#: those assert the probes stay reachable WITHOUT a credential.
INTERNAL_HEADERS = {"x-internal-token": TEST_INTERNAL_TOKEN}
