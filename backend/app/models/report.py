"""Report model — the executive analysis and launch recommendation.

Stores the decision-engine verdict plus the narrative sections produced by the
AI Product Analyst so an executive summary can be rendered/exported instantly.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.experiment import Experiment


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), unique=True, index=True
    )

    decision: Mapped[str] = mapped_column(String(20))          # DecisionType value
    confidence_score: Mapped[float] = mapped_column(Float)     # 0..100 composite confidence
    headline: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str] = mapped_column(Text)
    generated_by: Mapped[str] = mapped_column(String(40), default="rule-engine")  # or "anthropic"

    # Structured narrative sections consumed by the frontend & PDF export.
    # {"why_it_won": "...", "business_impact": "...", "risks": "...",
    #  "biases": "...", "confounders": "...", "revenue": "...",
    #  "next_experiments": [...], "pm_observations": [...], "decision_factors": {...}}
    sections: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    experiment: Mapped["Experiment"] = relationship(back_populates="report")
