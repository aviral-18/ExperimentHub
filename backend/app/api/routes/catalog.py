"""Reference data: the metric catalog, experiment templates and segment dims."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.results import MetricSpecRead
from app.simulation.segments import SEGMENTS
from app.utils.metrics_catalog import METRIC_SPECS
from app.utils.templates import EXPERIMENT_TEMPLATES

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/metrics", response_model=list[MetricSpecRead])
def list_metrics() -> list[MetricSpecRead]:
    return [
        MetricSpecRead(
            key=m.key, label=m.label, unit=m.unit, metric_type=m.metric_type,
            goal=m.goal, baseline=m.baseline, description=m.description, category=m.category,
        )
        for m in METRIC_SPECS
    ]


@router.get("/templates")
def list_templates() -> list[dict]:
    return EXPERIMENT_TEMPLATES


@router.get("/segments")
def list_segments() -> dict:
    return {dim: {"label": cfg["label"], "values": cfg["values"]} for dim, cfg in SEGMENTS.items()}
