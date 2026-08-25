"""Deny-by-default internal-token gate for the Python services.

This is the Python counterpart of catalog-svc's `plugins/internal-auth.ts` and
media-svc's, and it exists for the same measured reason: **network membership is
not identity.** Every service here sits on `dt_internal`, and that network stopped
being "only our own containers" the day qr-bell joined it to reuse Traefik. A
caller that can route to the container is not thereby a caller we trust.

Until this module landed, the four Python services had *no* credential check of
any kind — not an opt-in one that routes could forget, but none at all. So an
uncredentialed co-tenant could spend our Anthropic and embedding budgets, read any
guest's chat history, and message a guest as the host.

Three deliberate choices, each of which is the difference between a gate and a
gate-shaped thing:

1. **ASGI middleware, not a FastAPI dependency.** A `Depends(...)` is opt-in: it
   guards the routes that remember to list it, and a route added next month is
   born open. Middleware wraps the app, so coverage is the default and a new route
   inherits it without anyone deciding to be careful.

2. **It answers the `websocket` scope too.** chat-hub exposes `/ws/{client_id}`,
   which streams a named guest's live messages. An HTTP-only gate would have left
   the single most sensitive surface in the stack wide open while every test went
   green — the exact shape this codebase keeps finding. A websocket is refused by
   declining the handshake, because there is no response object to put a 401 in.

3. **`/health` and `/ready` stay open.** Docker's healthcheck sends no headers, and
   a probe that needs a secret is a probe someone eventually disables. These leak
   nothing beyond liveness.
"""
from __future__ import annotations

import hmac
from collections.abc import Awaitable, Callable

Scope = dict[str, object]
Receive = Callable[[], Awaitable[dict[str, object]]]
Send = Callable[[dict[str, object]], Awaitable[None]]

#: Paths reachable without a credential. Deliberately tiny — see the note above.
OPEN_PATHS = frozenset({"/health", "/ready"})

#: The header every internal caller presents. Matches the TypeScript services so
#: one convention covers the whole mesh.
HEADER_NAME = b"x-internal-token"

#: Refusal code for a websocket handshake. 1008 is "policy violation", which is
#: what an unauthenticated connection is.
WS_POLICY_VIOLATION = 1008


class InternalAuthMiddleware:
    """Reject any request that does not present the service's internal token.

    Deny-by-default: anything not in :data:`OPEN_PATHS` needs a valid token, and an
    unrecognised scope type is refused rather than passed through.
    """

    def __init__(
        self,
        app: Callable[[Scope, Receive, Send], Awaitable[None]],
        *,
        token: str,
        extra_open_paths: frozenset[str] | set[str] | None = None,
    ) -> None:
        # An empty token would make `compare_digest` succeed against a caller that
        # also sends nothing, turning the gate into a no-op. Services enforce a
        # 32-char minimum in their settings; this is the backstop for anyone
        # constructing the middleware directly.
        if not token:
            raise ValueError(
                "InternalAuthMiddleware requires a non-empty token; "
                "an empty token would admit uncredentialed callers"
            )
        self._app = app
        self._token = token.encode("utf-8")
        # ⚠️ Every path added here is a path this gate stops protecting. Only add
        # one whose handler authenticates its own caller — an external provider
        # webhook that verifies a signature, say. And check that the handler's own
        # check CANNOT BE SKIPPED: a guard of the form `if secret and mismatch:
        # reject` does nothing when the secret is unset, so exempting such a path
        # yields a route with no authentication at all. That exact combination was
        # found in chat-hub's Telegram webhook while this module was being wired in.
        self._open_paths = OPEN_PATHS | frozenset(extra_open_paths or ())

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        scope_type = scope.get("type")

        # Lifespan carries no caller and must pass through, or the app never starts.
        if scope_type == "lifespan":
            await self._app(scope, receive, send)
            return

        if scope_type not in ("http", "websocket"):
            # Unknown scope: refuse rather than assume it is harmless. There is no
            # protocol-correct way to answer, so drop it.
            return

        if self._is_open_path(scope) or self._is_authorised(scope):
            await self._app(scope, receive, send)
            return

        if scope_type == "websocket":
            await self._deny_websocket(send)
        else:
            await self._deny_http(send)

    def _is_open_path(self, scope: Scope) -> bool:
        raw_path = scope.get("path")
        path = raw_path if isinstance(raw_path, str) else ""
        # Exact membership, never a prefix test: `startswith("/health")` would
        # also admit `/healthz-secret` and anything else sharing the prefix.
        return path in self._open_paths

    def _is_authorised(self, scope: Scope) -> bool:
        presented = self._read_header(scope)
        if presented is None:
            return False
        # Constant-time: a timing-variable comparison lets a co-tenant recover the
        # token byte by byte, and it is the same cost to do this correctly.
        return hmac.compare_digest(presented, self._token)

    @staticmethod
    def _read_header(scope: Scope) -> bytes | None:
        raw_headers = scope.get("headers")
        if not isinstance(raw_headers, (list, tuple)):
            return None
        for item in raw_headers:
            if not isinstance(item, (list, tuple)) or len(item) != 2:
                continue
            name, value = item
            if isinstance(name, bytes) and name.lower() == HEADER_NAME and isinstance(value, bytes):
                return value
        return None

    @staticmethod
    async def _deny_http(send: Send) -> None:
        body = b'{"error":"unauthorized"}'
        await send(
            {
                "type": "http.response.start",
                "status": 401,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})

    @staticmethod
    async def _deny_websocket(send: Send) -> None:
        # Declining the handshake outright is the correct refusal: accepting and
        # then closing would hand the caller an open socket, however briefly.
        await send({"type": "websocket.close", "code": WS_POLICY_VIOLATION})
