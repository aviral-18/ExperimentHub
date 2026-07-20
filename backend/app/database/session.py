"""Database engine and session management.

A single declarative ``Base`` and a request-scoped session factory. The
``get_db`` dependency yields a session and guarantees it is closed, which is the
canonical FastAPI + SQLAlchemy pattern.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# SQLite needs ``check_same_thread=False`` for FastAPI's threadpool. Postgres
# ignores connect_args and benefits from a pre-ping to drop stale connections.
connect_args = {"check_same_thread": False} if settings.is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=not settings.is_sqlite,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""


def get_db() -> Generator:
    """FastAPI dependency that provides a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
