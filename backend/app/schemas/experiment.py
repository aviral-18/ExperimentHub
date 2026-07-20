"""Experiment schemas: create/update payloads and read models."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ExperimentCreate(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    description: str = ""
    hypothesis: str = ""
    business_objective: str = ""
    success_criteria: str = ""
    area: str = "Checkout"

    primary_metric_key: str = "conversion_rate"
    secondary_metric_keys: list[str] = Field(default_factory=list)

    control_name: str = "Control"
    treatment_name: str = "Treatment"
    # Ground-truth effect the simulator applies to treatment (the thing the
    # analysis tries to discover). Kept server-side for realism.
    treatment_true_effect_pct: float = Field(default=5.0, ge=-50, le=50)

    traffic_allocation: float = Field(default=1.0, gt=0, le=1)
    control_split: float = Field(default=0.5, gt=0, lt=1)
    expected_lift_pct: float = Field(default=5.0, gt=0, le=100)
    confidence_level: float = Field(default=0.95, ge=0.8, le=0.99)
    power: float = Field(default=0.8, ge=0.5, le=0.99)
    duration_days: int = Field(default=14, ge=1, le=120)
    total_users: int = Field(default=100_000, ge=2_000, le=2_000_000)


class ExperimentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    hypothesis: str | None = None
    business_objective: str | None = None
    success_criteria: str | None = None
    area: str | None = None
    expected_lift_pct: float | None = None
    confidence_level: float | None = None
    power: float | None = None
    duration_days: int | None = None
    total_users: int | None = None
    treatment_true_effect_pct: float | None = None


class VariantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    role: str
    description: str


class MetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    label: str
    unit: str
    metric_type: str
    goal: str
    is_primary: bool


class ExperimentSummary(BaseModel):
    """Lightweight card representation for lists."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    key: str
    area: str
    status: str
    primary_metric_key: str
    expected_lift_pct: float
    total_users: int
    duration_days: int
    created_at: datetime
    updated_at: datetime
    # Result summary (populated when the experiment has been analysed).
    decision: str | None = None
    primary_lift_pct: float | None = None
    significant: bool | None = None
    has_results: bool = False


class ExperimentDetail(ExperimentSummary):
    description: str
    hypothesis: str
    business_objective: str
    success_criteria: str
    traffic_allocation: float
    control_split: float
    confidence_level: float
    power: float
    launched_at: datetime | None
    variants: list[VariantRead]
    metrics: list[MetricRead]
    has_results: bool = False
