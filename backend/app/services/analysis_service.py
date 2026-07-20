"""Analysis orchestration.

Runs the full experiment pipeline and persists every artefact:

    simulate → aggregate → run statistics per metric → decide → narrate → store

This is the single entry point the API calls to "run" an experiment.
"""
from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.experiment import Experiment, ExperimentStatus
from app.models.report import Report
from app.models.result import StatisticalResult
from app.models.simulation import (
    SegmentResult,
    SimulationRun,
    SimulationStatus,
    VariantMetricResult,
)
from app.models.variant import VariantRole
from app.services import ai_analyst, decision_engine
from app.services.ai_analyst import ExperimentContext
from app.simulation.engine import SimulationEngine
from app.statistics.engine import MetricAnalysis, MetricObservation, analyze_metric
from app.utils.metrics_catalog import METRIC_SPECS, get_metric


def _observation(agg: dict) -> MetricObservation:
    return MetricObservation(
        n=agg["n"], mean=agg["mean"], std=agg["std"], successes=agg["successes"]
    )


def run_analysis(db: Session, experiment: Experiment, seed: int | None = None) -> SimulationRun:
    """Execute simulation + statistics + decision + narrative for one experiment."""
    control = next((v for v in experiment.variants if v.role == VariantRole.CONTROL), None)
    treatment = next((v for v in experiment.variants if v.role == VariantRole.TREATMENT), None)
    if control is None or treatment is None:
        raise ValueError("Experiment must have exactly one control and one treatment variant.")

    run_seed = seed if seed is not None else (experiment.id * 101 + 7)

    # Clear any previous run artefacts so re-runs are idempotent.
    _reset_previous_runs(db, experiment.id)

    run = SimulationRun(
        experiment_id=experiment.id,
        seed=run_seed,
        n_users=experiment.total_users,
        status=SimulationStatus.RUNNING,
    )
    db.add(run)
    db.flush()  # assign run.id

    # --- 1. Simulate --------------------------------------------------- #
    engine = SimulationEngine(
        n_users=experiment.total_users,
        seed=run_seed,
        control_split=experiment.control_split,
        duration_days=experiment.duration_days,
        primary_metric_key=experiment.primary_metric_key,
        true_effect_pct=treatment.true_effect_pct,
    )
    out = engine.run()

    run.duration_ms = out.duration_ms
    run.daily_series = out.daily_series
    run.funnel = out.funnel

    # --- 2. Persist per-variant aggregates ----------------------------- #
    for metric_key, per_role in out.variant_metrics.items():
        hist = out.histograms.get(metric_key, {})
        for role in ("control", "treatment"):
            agg = per_role[role]
            db.add(VariantMetricResult(
                run_id=run.id,
                variant_role=role,
                metric_key=metric_key,
                n=agg["n"], mean=agg["mean"], std=agg["std"],
                total=agg["total"], successes=agg["successes"],
                histogram=(
                    {"bins": hist["bins"], "counts": hist[role]} if hist else {}
                ),
            ))

    # --- 3. Persist segment breakdowns --------------------------------- #
    for s in out.segments:
        db.add(SegmentResult(
            run_id=run.id,
            dimension=s["dimension"],
            segment=s["segment"],
            metric_key=s["metric_key"],
            control_n=s["control_n"], control_mean=s["control_mean"],
            treatment_n=s["treatment_n"], treatment_mean=s["treatment_mean"],
            lift_pct=s["lift_pct"], p_value=s["p_value"], significant=s["significant"],
        ))

    # --- 4. Statistics for every metric -------------------------------- #
    analyses: dict[str, MetricAnalysis] = {}
    for spec in METRIC_SPECS:
        per_role = out.variant_metrics[spec.key]
        analysis = analyze_metric(
            metric_key=spec.key,
            metric_type=spec.metric_type,
            goal=spec.goal,
            control=_observation(per_role["control"]),
            treatment=_observation(per_role["treatment"]),
            confidence=experiment.confidence_level,
            power_target=experiment.power,
        )
        analyses[spec.key] = analysis
        db.add(_to_stat_row(experiment.id, run.id, analysis, spec.key == experiment.primary_metric_key))

    primary = analyses[experiment.primary_metric_key]

    # --- 5. Launch decision -------------------------------------------- #
    decision = decision_engine.decide(
        primary=primary,
        analyses=analyses,
        total_users=experiment.total_users,
        traffic_allocation=experiment.traffic_allocation,
        duration_days=experiment.duration_days,
        expected_lift_pct=experiment.expected_lift_pct,
    )

    # --- 6. AI narrative ----------------------------------------------- #
    ctx = ExperimentContext(
        name=experiment.name,
        hypothesis=experiment.hypothesis,
        business_objective=experiment.business_objective,
        primary_metric_key=experiment.primary_metric_key,
        control_name=control.name,
        treatment_name=treatment.name,
        area=experiment.area,
        expected_lift_pct=experiment.expected_lift_pct,
        confidence_level=experiment.confidence_level,
    )
    narrative = ai_analyst.generate_narrative(
        ctx, primary, analyses, decision, out.segments, experiment.control_split
    )

    # --- 7. Upsert report ---------------------------------------------- #
    _upsert_report(db, experiment, decision, narrative)

    # --- 8. Finalise --------------------------------------------------- #
    run.status = SimulationStatus.COMPLETED
    experiment.status = ExperimentStatus.COMPLETED
    db.commit()
    db.refresh(run)
    return run


def _reset_previous_runs(db: Session, experiment_id: int) -> None:
    db.execute(delete(StatisticalResult).where(StatisticalResult.experiment_id == experiment_id))
    old_runs = db.query(SimulationRun).filter(SimulationRun.experiment_id == experiment_id).all()
    for r in old_runs:
        db.delete(r)  # cascades to variant/segment results
    db.flush()


def _to_stat_row(experiment_id, run_id, a: MetricAnalysis, is_primary: bool) -> StatisticalResult:
    return StatisticalResult(
        experiment_id=experiment_id,
        run_id=run_id,
        metric_key=a.metric_key,
        metric_type=a.metric_type,
        is_primary=is_primary,
        control_value=a.control_value,
        treatment_value=a.treatment_value,
        absolute_diff=a.absolute_diff,
        relative_lift_pct=a.relative_lift_pct,
        test_name=a.test_name,
        statistic=a.statistic,
        p_value=a.p_value,
        ci_low=a.ci_low,
        ci_high=a.ci_high,
        ci_level=a.ci_level,
        effect_size=a.effect_size,
        effect_label=a.effect_label,
        achieved_power=a.achieved_power,
        mde_abs=a.mde_abs,
        required_sample_per_arm=a.required_sample_per_arm,
        significant=a.significant,
    )


def _upsert_report(db, experiment, decision, narrative) -> None:
    report = experiment.report
    if report is None:
        report = Report(experiment_id=experiment.id)
        db.add(report)
    report.decision = decision.decision.value
    report.confidence_score = decision.confidence_score
    report.headline = narrative["headline"]
    report.summary = narrative["summary"]
    report.generated_by = narrative["generated_by"]
    report.sections = {
        **narrative["sections"],
        "decision_factors": decision.factors_as_dict(),
        "projected_annual_revenue": decision.projected_annual_revenue,
    }
