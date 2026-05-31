"""SQLAlchemy 2 mapped models for the `chat` schema (T-4.0.1).

Owned by chat_svc (see migrations/0001_chat_core.sql):

- `chat_thread` — one per guest (logical ref to the reservation guest);
  auto-created on first inbound message.
- `message`     — every frame, inbound (guest → platform) or outbound
  (platform → guest), in arrival order.
- `channel_binding` — external-channel identity → thread (Telegram/WhatsApp;
  unused by in_app).
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ChatThreadRow(Base):
    __tablename__ = "chat_thread"
    __table_args__ = ({"schema": "chat"},)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    guest_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class MessageRow(Base):
    __tablename__ = "message"
    __table_args__ = ({"schema": "chat"},)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    thread_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    channel: Mapped[str] = mapped_column(Text, nullable=False)
    sender_id: Mapped[str] = mapped_column(Text, nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    external_message_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ChannelBindingRow(Base):
    __tablename__ = "channel_binding"
    __table_args__ = ({"schema": "chat"},)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    thread_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    channel: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


__all__ = ["Base", "ChannelBindingRow", "ChatThreadRow", "MessageRow"]
