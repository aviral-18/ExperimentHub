"""Simulation persistence.

Design note: a real experiment generates *millions* of raw events. Persisting
100k+ raw rows per run into the analytics DB is an anti-pattern — production
platforms (Statsig, Eppo, internal tools) store **pre-aggregated** results and
keep raw events in a columnar warehouse. We follow that pattern:

* ``SimulationRun``        — one row of run metadata (seed, size, timings).
* ``VariantMetricResult``  — aggregated statistics per (variant, metric).
* ``SegmentResult``        — aggregated per-segment slice for deep dives.

The raw per-user frame is generated in memory, drives all statistics, and is
then discarded — exactly how an aggregation pipeline behaves.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.experiment import Experiment


class SimulationStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    seed: Mapped[int] = mapped_column(Integer, default=42)
    n_users: Mapped[int] = mapped_column(Integer, default=100_000)
    status: Mapped[SimulationStatus] = mapped_column(
        SAEnum(SimulationStatus, native_enum=False, length=20), default=SimulationStatus.PENDING
    )
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # Time-series of the primary metric across the experiment window, per variant,
    # used to draw the "metric trend" chart. Shape: {"control": [...], "treatment": [...]}
    daily_series: Mapped[dict] = mapped_column(JSON, default=dict)
    # Conversion funnel counts per variant.
    funnel: Mapped[dict] = mapped_column(JSON, default=dict)

    experiment: Mapped["Experiment"] = relationship(back_populates="runs")
    variant_results: Mapped[list["VariantMetricResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    segment_results: Mapped[list["SegmentResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class VariantMetricResult(Base):
    """Aggregated observed statistics for one metric within one variant."""

    __tablename__ = "variant_metric_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("simulation_runs.id", ondelete="CASCADE"), index=True
    )
    variant_role: Mapped[str] = mapped_column(String(20))   # control | treatment
    metric_key: Mapped[str] = mapped_column(String(80), index=True)

    n: Mapped[int] = mapped_column(Integer)          # sample size (users)
    mean: Mapped[float] = mapped_column(Float)       # observed mean / proportion
    std: Mapped[float] = mapped_column(Float)        # observed standard deviation
    total: Mapped[float] = mapped_column(Float, default=0.0)      # sum (e.g. total revenue)
    successes: Mapped[int] = mapped_column(Integer, default=0)    # for proportions
    # Histogram for distribution curves: {"bins": [...], "counts": [...]}
    histogram: Mapped[dict] = mapped_column(JSON, default=dict)

    run: Mapped["SimulationRun"] = relationship(back_populates="variant_results")


class SegmentResult(Base):
    """Per-segment slice of the primary metric for both variants."""

    __tablename__ = "segment_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("simulation_runs.id", ondelete="CASCADE"), index=True
    )
    dimension: Mapped[str] = mapped_column(String(40))   # "device", "user_type", ...
    segment: Mapped[str] = mapped_column(String(60))     # "iOS", "New", "Mumbai", ...
    metric_key: Mapped[str] = mapped_column(String(80))

    control_n: Mapped[int] = mapped_column(Integer)
    control_mean: Mapped[float] = mapped_column(Float)
    treatment_n: Mapped[int] = mapped_column(Integer)
    treatment_mean: Mapped[float] = mapped_column(Float)
    lift_pct: Mapped[float] = mapped_column(Float)
    p_value: Mapped[float] = mapped_column(Float)
    significant: Mapped[bool] = mapped_column(default=False)

    run: Mapped["SimulationRun"] = relationship(back_populates="segment_results")
