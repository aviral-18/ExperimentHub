"""Schemas for analysis results, segments, decision and report payloads."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class StatResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    metric_key: str
    metric_type: str
    is_primary: bool
    control_value: float
    treatment_value: float
    absolute_diff: float
    relative_lift_pct: float
    test_name: str
    statistic: float
    p_value: float
    ci_low: float
    ci_high: float
    ci_level: float
    effect_size: float
    effect_label: str
    achieved_power: float
    mde_abs: float
    required_sample_per_arm: int
    significant: bool


class SegmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    dimension: str
    segment: str
    metric_key: str
    control_n: int
    control_mean: float
    treatment_n: int
    treatment_mean: float
    lift_pct: float
    p_value: float
    significant: bool


class VariantMetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    variant_role: str
    metric_key: str
    n: int
    mean: float
    std: float
    total: float
    successes: int
    histogram: dict


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    decision: str
    confidence_score: float
    headline: str
    summary: str
    generated_by: str
    sections: dict


class RunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    seed: int
    n_users: int
    status: str
    duration_ms: int
    daily_series: dict
    funnel: dict


class AnalysisResponse(BaseModel):
    """Everything the experiment-detail page needs in one payload."""
    experiment_id: int
    run: RunRead
    report: ReportRead
    primary_metric_key: str
    statistical_results: list[StatResultRead]
    segments: list[SegmentRead]
    variant_metrics: list[VariantMetricRead]


class MetricSpecRead(BaseModel):
    key: str
    label: str
    unit: str
    metric_type: str
    goal: str
    baseline: float
    description: str
    category: str
