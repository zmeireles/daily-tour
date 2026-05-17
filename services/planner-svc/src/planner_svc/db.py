"""Async SQLAlchemy engine + session factory (T-3.0.3).

Mirrors the search-svc pattern: module-level lazily-constructed engine,
session factory, and an `async with` context manager for short-lived
unit-of-work sessions. The settings.database_url URL must be the
postgresql+asyncpg DSN — the engine rewrites the scheme if needed so
the same value works for both raw `asyncpg.connect` and SQLAlchemy.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _async_url(raw: str) -> str:
    # Accept plain postgresql:// URLs (what infra/.env ships) and rewrite to
    # postgresql+asyncpg:// for SQLAlchemy. Other dialects pass through.
    if raw.startswith("postgresql://"):
        return "postgresql+asyncpg://" + raw[len("postgresql://") :]
    return raw


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            _async_url(settings.database_url),
            echo=False,
            pool_pre_ping=True,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _session_factory


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    factory = get_session_factory()
    async with factory() as session:
        yield session


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None
