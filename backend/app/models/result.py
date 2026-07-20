"""Statistical result of comparing treatment vs control for a single metric."""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.experiment import Experiment


class DecisionType(str, enum.Enum):
    LAUNCH = "launch"
    ITERATE = "iterate"        # continue / iterate on the experiment
    ROLLBACK = "rollback"
    STOP = "stop"
    INCONCLUSIVE = "inconclusive"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StatisticalResult(Base):
    __tablename__ = "statistical_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    run_id: Mapped[int] = mapped_column(ForeignKey("simulation_runs.id", ondelete="CASCADE"))
    metric_key: Mapped[str] = mapped_column(String(80), index=True)
    metric_type: Mapped[str] = mapped_column(String(20))  # proportion | mean
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    # --- Point estimates ---
    control_value: Mapped[float] = mapped_column(Float)
    treatment_value: Mapped[float] = mapped_column(Float)
    absolute_diff: Mapped[float] = mapped_column(Float)
    relative_lift_pct: Mapped[float] = mapped_column(Float)

    # --- Inference ---
    test_name: Mapped[str] = mapped_column(String(60))       # e.g. "Two-proportion z-test"
    statistic: Mapped[float] = mapped_column(Float)          # z or t
    p_value: Mapped[float] = mapped_column(Float)
    ci_low: Mapped[float] = mapped_column(Float)             # CI on the absolute difference
    ci_high: Mapped[float] = mapped_column(Float)
    ci_level: Mapped[float] = mapped_column(Float, default=0.95)
    effect_size: Mapped[float] = mapped_column(Float)        # Cohen's d / h
    effect_label: Mapped[str] = mapped_column(String(40), default="")  # negligible/small/...

    # --- Power / design diagnostics ---
    achieved_power: Mapped[float] = mapped_column(Float, default=0.0)
    mde_abs: Mapped[float] = mapped_column(Float, default=0.0)   # minimum detectable effect (abs)
    required_sample_per_arm: Mapped[int] = mapped_column(Integer, default=0)

    significant: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    experiment: Mapped["Experiment"] = relationship(back_populates="statistical_results")
