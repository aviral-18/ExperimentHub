"""Analysis routes: run the pipeline and fetch the full result payload."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.experiment import Experiment
from app.models.result import StatisticalResult
from app.models.simulation import SimulationRun, VariantMetricResult
from app.models.user import User
from app.schemas.results import (
    AnalysisResponse,
    ReportRead,
    RunRead,
    SegmentRead,
    StatResultRead,
    VariantMetricRead,
)
from app.services import analysis_service

router = APIRouter(prefix="/experiments", tags=["analysis"])


def _get_owned(db: Session, exp_id: int, user: User) -> Experiment:
    exp = db.get(Experiment, exp_id)
    if exp is None or exp.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.post("/{exp_id}/run", response_model=AnalysisResponse)
def run_experiment(
    exp_id: int, seed: int | None = None,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
) -> AnalysisResponse:
    exp = _get_owned(db, exp_id, user)
    try:
        analysis_service.run_analysis(db, exp, seed=seed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _build_analysis_response(db, exp)


@router.get("/{exp_id}/analysis", response_model=AnalysisResponse)
def get_analysis(
    exp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> AnalysisResponse:
    exp = _get_owned(db, exp_id, user)
    if exp.report is None:
        raise HTTPException(status_code=404, detail="Experiment has no results yet. Run it first.")
    return _build_analysis_response(db, exp)


def _build_analysis_response(db: Session, exp: Experiment) -> AnalysisResponse:
    run = (
        db.query(SimulationRun)
        .filter(SimulationRun.experiment_id == exp.id)
        .order_by(SimulationRun.id.desc())
        .first()
    )
    if run is None:
        raise HTTPException(status_code=404, detail="No simulation run found")

    stat_rows = (
        db.query(StatisticalResult)
        .filter(StatisticalResult.experiment_id == exp.id, StatisticalResult.run_id == run.id)
        .all()
    )
    variant_metrics = (
        db.query(VariantMetricResult).filter(VariantMetricResult.run_id == run.id).all()
    )

    # Order stat rows: primary first, then by |lift|.
    stat_rows.sort(key=lambda r: (not r.is_primary, -abs(r.relative_lift_pct)))

    return AnalysisResponse(
        experiment_id=exp.id,
        run=RunRead.model_validate(run),
        report=ReportRead.model_validate(exp.report),
        primary_metric_key=exp.primary_metric_key,
        statistical_results=[StatResultRead.model_validate(r) for r in stat_rows],
        segments=[SegmentRead.model_validate(s) for s in run.segment_results],
        variant_metrics=[VariantMetricRead.model_validate(v) for v in variant_metrics],
    )
