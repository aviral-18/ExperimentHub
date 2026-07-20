"""Experiment lifecycle service — create, duplicate, archive, launch."""
from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.experiment import Experiment, ExperimentStatus
from app.models.metric import MetricDefinition
from app.models.variant import Variant, VariantRole
from app.utils.metrics_catalog import get_metric


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:60] or "experiment"


def create_experiment(db: Session, owner_id: int, payload) -> Experiment:
    """Create an experiment plus its two variants and metric definitions."""
    exp = Experiment(
        owner_id=owner_id,
        name=payload.name,
        key=_slugify(payload.name),
        description=payload.description,
        hypothesis=payload.hypothesis,
        business_objective=payload.business_objective,
        success_criteria=payload.success_criteria,
        area=payload.area,
        primary_metric_key=payload.primary_metric_key,
        traffic_allocation=payload.traffic_allocation,
        control_split=payload.control_split,
        expected_lift_pct=payload.expected_lift_pct,
        confidence_level=payload.confidence_level,
        power=payload.power,
        duration_days=payload.duration_days,
        total_users=payload.total_users,
        status=ExperimentStatus.DRAFT,
    )
    db.add(exp)
    db.flush()

    exp.key = f"{_slugify(payload.name)}-{exp.id}"

    db.add(Variant(
        experiment_id=exp.id, name=payload.control_name, role=VariantRole.CONTROL,
        description="Existing experience (baseline).", true_effect_pct=0.0,
    ))
    db.add(Variant(
        experiment_id=exp.id, name=payload.treatment_name, role=VariantRole.TREATMENT,
        description="Proposed new experience.", true_effect_pct=payload.treatment_true_effect_pct,
    ))

    # Metric definitions: primary first, then unique secondaries.
    metric_keys = [payload.primary_metric_key] + [
        k for k in payload.secondary_metric_keys if k != payload.primary_metric_key
    ]
    for i, key in enumerate(metric_keys):
        spec = get_metric(key)
        db.add(MetricDefinition(
            experiment_id=exp.id, key=key, label=spec.label, unit=spec.unit,
            metric_type=spec.metric_type, goal=spec.goal, is_primary=(i == 0),
        ))

    db.commit()
    db.refresh(exp)
    return exp


def duplicate_experiment(db: Session, source: Experiment, owner_id: int) -> Experiment:
    """Clone an experiment's design as a fresh draft (no results)."""
    exp = Experiment(
        owner_id=owner_id,
        name=f"{source.name} (Copy)",
        key=_slugify(source.name),
        description=source.description,
        hypothesis=source.hypothesis,
        business_objective=source.business_objective,
        success_criteria=source.success_criteria,
        area=source.area,
        primary_metric_key=source.primary_metric_key,
        traffic_allocation=source.traffic_allocation,
        control_split=source.control_split,
        expected_lift_pct=source.expected_lift_pct,
        confidence_level=source.confidence_level,
        power=source.power,
        duration_days=source.duration_days,
        total_users=source.total_users,
        status=ExperimentStatus.DRAFT,
    )
    db.add(exp)
    db.flush()
    exp.key = f"{_slugify(source.name)}-{exp.id}"

    for v in source.variants:
        db.add(Variant(
            experiment_id=exp.id, name=v.name, role=v.role,
            description=v.description, true_effect_pct=v.true_effect_pct,
        ))
    for m in source.metrics:
        db.add(MetricDefinition(
            experiment_id=exp.id, key=m.key, label=m.label, unit=m.unit,
            metric_type=m.metric_type, goal=m.goal, is_primary=m.is_primary,
        ))
    db.commit()
    db.refresh(exp)
    return exp


def set_status(db: Session, experiment: Experiment, status: ExperimentStatus) -> Experiment:
    experiment.status = status
    if status == ExperimentStatus.RUNNING and experiment.launched_at is None:
        experiment.launched_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(experiment)
    return experiment
