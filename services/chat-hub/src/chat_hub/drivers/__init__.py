"""Message driver abstraction (T-4.0.0).

Every channel (in-app WS, Telegram, WhatsApp) implements `MessageDriver`.
`chat-hub` core never imports a concrete driver — it speaks Protocol so
new channels land as new modules with no core changes (D9, see
docs/exploration/03-architecture.md §"Channel bridge").

`InboundMessage` and `OutboundMessage` are the *normalized* shape. Drivers
translate channel-native payloads to/from these. The full `Message` /
`ChatThread` shape from packages/shared-types lands once persistence does
in T-4.1.x; this skeleton stays minimal on purpose.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable, Literal, Protocol, runtime_checkable

Channel = Literal["in_app", "telegram", "whatsapp"]


@dataclass(frozen=True)
class OutboundMessage:
    """A message the platform wants to deliver to a recipient on `channel`."""

    channel: Channel
    recipient_id: str
    body: str


@dataclass(frozen=True)
class InboundMessage:
    """A message received from a channel, normalized for downstream handlers."""

    channel: Channel
    sender_id: str
    body: str
    external_message_id: str | None = None


InboundCallback = Callable[[InboundMessage], Awaitable[None]]


@runtime_checkable
class MessageDriver(Protocol):
    """Per-channel send + inbound-callback registration.

    Drivers MUST:
      - return a channel-native message id (or empty string when the channel
        has no notion of one — e.g. fanout WS broadcasts) from `send`;
      - invoke every callback registered via `on_receive` for each inbound
        message, in registration order, awaiting each before the next.
    """

    @property
    def channel(self) -> Channel: ...

    async def send(self, message: OutboundMessage) -> str: ...

    def on_receive(self, callback: InboundCallback) -> None: ...
