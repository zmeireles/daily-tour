"""SQLAlchemy 2 mapped models for read-only access to `catalog.place`.

The Node catalog-svc owns the schema (drizzle migrations under
services/catalog-svc/drizzle/migrations/). This module mirrors the
columns we need for embedding + hybrid query; it must stay in lockstep
with that migration. T-2.0.0 covers the read-only shape; T-2.0.1 lands
the embedding worker that joins this with `search.place_embedding`.
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Place(Base):
    __tablename__ = "place"
    __table_args__ = ({"schema": "catalog"},)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    guesthouse_scope: Mapped[dict[str, object] | list[str]] = mapped_column(JSONB, nullable=False)
    name: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False)
    description: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False)
    geom_lat: Mapped[float] = mapped_column(Float, nullable=False)
    geom_lng: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    contacts: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    hours: Mapped[list[dict[str, object]]] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    is_hosts_pick: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_kind: Mapped[str] = mapped_column(Text, nullable=False)
    source_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
