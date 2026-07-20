"""Experiment CRUD, lifecycle and comparison routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.experiment import Experiment, ExperimentStatus
from app.models.user import User
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentDetail,
    ExperimentSummary,
    ExperimentUpdate,
    MetricRead,
    VariantRead,
)
from app.services import experiment_service

router = APIRouter(prefix="/experiments", tags=["experiments"])


def _to_detail(exp: Experiment) -> ExperimentDetail:
    has_results = exp.report is not None
    return ExperimentDetail(
        id=exp.id, name=exp.name, key=exp.key, area=exp.area, status=exp.status.value,
        primary_metric_key=exp.primary_metric_key, expected_lift_pct=exp.expected_lift_pct,
        total_users=exp.total_users, duration_days=exp.duration_days,
        created_at=exp.created_at, updated_at=exp.updated_at,
        description=exp.description, hypothesis=exp.hypothesis,
        business_objective=exp.business_objective, success_criteria=exp.success_criteria,
        traffic_allocation=exp.traffic_allocation, control_split=exp.control_split,
        confidence_level=exp.confidence_level, power=exp.power, launched_at=exp.launched_at,
        variants=[VariantRead.model_validate(v) for v in exp.variants],
        metrics=[MetricRead.model_validate(m) for m in exp.metrics],
        has_results=has_results,
    )


def _get_owned(db: Session, exp_id: int, user: User) -> Experiment:
    exp = db.get(Experiment, exp_id)
    if exp is None or exp.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.get("", response_model=list[ExperimentSummary])
def list_experiments(
    status: str | None = None,
    search: str | None = None,
    area: str | None = None,
    sort: str = Query("recent", pattern="^(recent|name|lift)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ExperimentSummary]:
    q = db.query(Experiment).filter(Experiment.owner_id == user.id)
    if status and status != "all":
        q = q.filter(Experiment.status == ExperimentStatus(status))
    if area and area != "all":
        q = q.filter(Experiment.area == area)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Experiment.name.ilike(like), Experiment.description.ilike(like)))
    if sort == "name":
        q = q.order_by(Experiment.name.asc())
    else:
        q = q.order_by(Experiment.updated_at.desc())

    summaries: list[ExperimentSummary] = []
    for e in q.all():
        s = ExperimentSummary.model_validate(e)
        primary = next((r for r in e.statistical_results if r.is_primary), None)
        if primary:
            s.primary_lift_pct = primary.relative_lift_pct
            s.significant = primary.significant
        if e.report:
            s.decision = e.report.decision
        s.has_results = e.report is not None
        summaries.append(s)

    # Optional lift sort (needs computed values).
    if sort == "lift":
        summaries.sort(key=lambda s: s.primary_lift_pct if s.primary_lift_pct is not None else -999,
                       reverse=True)
    return summaries


@router.post("", response_model=ExperimentDetail, status_code=201)
def create_experiment(
    payload: ExperimentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExperimentDetail:
    exp = experiment_service.create_experiment(db, user.id, payload)
    return _to_detail(exp)


@router.get("/{exp_id}", response_model=ExperimentDetail)
def get_experiment(
    exp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ExperimentDetail:
    return _to_detail(_get_owned(db, exp_id, user))


@router.patch("/{exp_id}", response_model=ExperimentDetail)
def update_experiment(
    exp_id: int, payload: ExperimentUpdate,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
) -> ExperimentDetail:
    exp = _get_owned(db, exp_id, user)
    data = payload.model_dump(exclude_unset=True)
    treatment_effect = data.pop("treatment_true_effect_pct", None)
    for field, value in data.items():
        setattr(exp, field, value)
    if treatment_effect is not None:
        from app.models.variant import VariantRole
        treatment = next((v for v in exp.variants if v.role == VariantRole.TREATMENT), None)
        if treatment:
            treatment.true_effect_pct = treatment_effect
    db.commit()
    db.refresh(exp)
    return _to_detail(exp)


@router.delete("/{exp_id}", status_code=204)
def delete_experiment(
    exp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    exp = _get_owned(db, exp_id, user)
    db.delete(exp)
    db.commit()
    return None


@router.post("/{exp_id}/duplicate", response_model=ExperimentDetail, status_code=201)
def duplicate_experiment(
    exp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ExperimentDetail:
    exp = _get_owned(db, exp_id, user)
    clone = experiment_service.duplicate_experiment(db, exp, user.id)
    return _to_detail(clone)


@router.post("/{exp_id}/status", response_model=ExperimentDetail)
def set_status(
    exp_id: int, status: str,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
) -> ExperimentDetail:
    exp = _get_owned(db, exp_id, user)
    try:
        new_status = ExperimentStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    experiment_service.set_status(db, exp, new_status)
    return _to_detail(exp)
