"""In-app WebSocket driver.

Mounts `/ws/{client_id}` on the FastAPI app. The driver keeps an in-memory
registry of `client_id → WebSocket`; `send` looks up the recipient and
pushes a JSON frame. Inbound text frames fan out to every registered
`on_receive` callback.

Single-instance only. Multi-replica fanout via Redis pub/sub is deferred
(see docs/exploration/03-architecture.md §"Channel bridge").
"""
from __future__ import annotations

import json
import logging
from typing import Final

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from . import Channel, InboundCallback, InboundMessage, OutboundMessage

logger = logging.getLogger(__name__)

_CHANNEL: Final[Channel] = "in_app"


class InAppDriver:
    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._callbacks: list[InboundCallback] = []

    @property
    def channel(self) -> Channel:
        return _CHANNEL

    async def send(self, message: OutboundMessage) -> str:
        if message.channel != _CHANNEL:
            raise ValueError(f"InAppDriver received message for channel {message.channel!r}")
        socket = self._connections.get(message.recipient_id)
        if socket is None:
            logger.info(
                "in_app send dropped — recipient offline",
                extra={"recipient_id": message.recipient_id},
            )
            return ""
        await socket.send_text(json.dumps({"body": message.body}))
        return ""

    async def send_json(self, recipient_id: str, payload: dict[str, object]) -> bool:
        """Push a typed JSON frame to a connected client.

        Returns True if the client was online and the frame was sent, False
        if the recipient has no live socket (e.g. acking after disconnect).
        Used for the structured frame protocol ({"type": "ack"|"message", …})
        that `send` (legacy `{"body": …}` shape) can't express.
        """
        socket = self._connections.get(recipient_id)
        if socket is None:
            return False
        await socket.send_text(json.dumps(payload))
        return True

    def on_receive(self, callback: InboundCallback) -> None:
        self._callbacks.append(callback)

    async def _dispatch(self, inbound: InboundMessage) -> None:
        for callback in self._callbacks:
            await callback(inbound)

    async def handle_connection(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        self._connections[client_id] = websocket
        try:
            while True:
                payload = await websocket.receive_text()
                await self._dispatch(
                    InboundMessage(channel=_CHANNEL, sender_id=client_id, body=payload),
                )
        except WebSocketDisconnect:
            logger.info("in_app client disconnected", extra={"client_id": client_id})
        finally:
            self._connections.pop(client_id, None)


_driver: InAppDriver | None = None


def get_in_app_driver() -> InAppDriver:
    """Return the process-singleton in-app driver, instantiating on first use."""
    global _driver
    if _driver is None:
        _driver = InAppDriver()
    return _driver


def reset_in_app_driver() -> None:
    """Test helper — drop the singleton so the next get_in_app_driver() rebuilds."""
    global _driver
    _driver = None


def mount_in_app_driver(app: FastAPI) -> InAppDriver:
    """Register the `/ws/{client_id}` endpoint on `app` and return the driver."""
    driver = get_in_app_driver()

    @app.websocket("/ws/{client_id}")
    async def websocket_endpoint(websocket: WebSocket, client_id: str) -> None:
        await driver.handle_connection(websocket, client_id)

    return driver
