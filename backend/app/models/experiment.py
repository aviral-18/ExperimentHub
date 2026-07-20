"""Experiment model — the central entity of the platform."""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.variant import Variant
    from app.models.metric import MetricDefinition
    from app.models.simulation import SimulationRun
    from app.models.result import StatisticalResult
    from app.models.report import Report


class ExperimentStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    ARCHIVED = "archived"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # --- Identity & narrative ---
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(80), index=True)  # url-safe short key
    description: Mapped[str] = mapped_column(Text, default="")
    hypothesis: Mapped[str] = mapped_column(Text, default="")
    business_objective: Mapped[str] = mapped_column(Text, default="")
    success_criteria: Mapped[str] = mapped_column(Text, default="")
    area: Mapped[str] = mapped_column(String(80), default="Checkout")  # product area / squad

    status: Mapped[ExperimentStatus] = mapped_column(
        SAEnum(ExperimentStatus, native_enum=False, length=20),
        default=ExperimentStatus.DRAFT,
        index=True,
    )

    # --- Design parameters ---
    primary_metric_key: Mapped[str] = mapped_column(String(80), default="conversion_rate")
    traffic_allocation: Mapped[float] = mapped_column(Float, default=1.0)  # 0..1 of eligible traffic
    control_split: Mapped[float] = mapped_column(Float, default=0.5)       # share to control
    expected_lift_pct: Mapped[float] = mapped_column(Float, default=5.0)   # MDE the PM is powering for
    confidence_level: Mapped[float] = mapped_column(Float, default=0.95)
    power: Mapped[float] = mapped_column(Float, default=0.8)
    duration_days: Mapped[int] = mapped_column(Integer, default=14)
    total_users: Mapped[int] = mapped_column(Integer, default=100_000)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
    launched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- Relationships ---
    owner: Mapped["User"] = relationship(back_populates="experiments")
    variants: Mapped[list["Variant"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan", order_by="Variant.id"
    )
    metrics: Mapped[list["MetricDefinition"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan", order_by="MetricDefinition.id"
    )
    runs: Mapped[list["SimulationRun"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan", order_by="SimulationRun.id"
    )
    statistical_results: Mapped[list["StatisticalResult"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan"
    )
    report: Mapped["Report | None"] = relationship(
        back_populates="experiment", cascade="all, delete-orphan", uselist=False
    )

    @property
    def latest_run(self) -> "SimulationRun | None":
        return self.runs[-1] if self.runs else None
