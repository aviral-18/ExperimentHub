"""Variant model — control and treatment arms of an experiment."""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.experiment import Experiment


class VariantRole(str, enum.Enum):
    CONTROL = "control"
    TREATMENT = "treatment"


class Variant(Base):
    __tablename__ = "variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[VariantRole] = mapped_column(
        SAEnum(VariantRole, native_enum=False, length=20), default=VariantRole.CONTROL
    )
    description: Mapped[str] = mapped_column(Text, default="")

    # Ground-truth "true" effect the simulator applies to the treatment arm.
    # This is what a real launch is trying to *discover*; the analysis never
    # sees it directly, it only observes noisy sampled behaviour.
    true_effect_pct: Mapped[float] = mapped_column(Float, default=0.0)

    experiment: Mapped["Experiment"] = relationship(back_populates="variants")
