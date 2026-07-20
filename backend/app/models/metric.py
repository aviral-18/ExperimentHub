"""Metric definitions attached to an experiment.

A metric is either a *proportion* (rate of a binary event, e.g. conversion
rate → analysed with a two-proportion z-test) or a *mean* (continuous value,
e.g. average order value → analysed with a two-sample t-test). Encoding the
type here lets the analysis engine pick the statistically correct test.
"""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.experiment import Experiment


class MetricType(str, enum.Enum):
    PROPORTION = "proportion"  # binary rate → two-proportion z-test
    MEAN = "mean"              # continuous → two-sample t-test


class MetricGoal(str, enum.Enum):
    INCREASE = "increase"  # higher is better (conversion, revenue)
    DECREASE = "decrease"  # lower is better (bounce, cart abandonment)


class MetricDefinition(Base):
    __tablename__ = "metric_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(80), nullable=False)   # e.g. "conversion_rate"
    label: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. "Conversion Rate"
    unit: Mapped[str] = mapped_column(String(20), default="")       # "%", "₹", "min", ""
    metric_type: Mapped[MetricType] = mapped_column(
        SAEnum(MetricType, native_enum=False, length=20), default=MetricType.PROPORTION
    )
    goal: Mapped[MetricGoal] = mapped_column(
        SAEnum(MetricGoal, native_enum=False, length=20), default=MetricGoal.INCREASE
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    experiment: Mapped["Experiment"] = relationship(back_populates="metrics")
