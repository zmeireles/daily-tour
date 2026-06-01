"""SQLAlchemy 2 mapped model for `planner.tour_plan` (T-3.0.3).

Owned by planner_svc (see migrations/0001_tour_plan.sql). The row carries
both the inbound request (request_payload) and the produced plan
(plan_payload, populated by the worker). `status` is a free-text column
— see the migration comment for the queued/ready/rejected lifecycle.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TourPlanRow(Base):
    __tablename__ = "tour_plan"
    __table_args__ = ({"schema": "planner"},)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    guest_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    reservation_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="queued")
    request_payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    plan_payload: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


__all__ = ["Base", "TourPlanRow"]
