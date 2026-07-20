"""Dashboard aggregation service — portfolio-level KPIs across all experiments."""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.experiment import Experiment, ExperimentStatus
from app.models.report import Report
from app.models.result import DecisionType, StatisticalResult


def build_dashboard(db: Session, owner_id: int) -> dict:
    exps = (
        db.query(Experiment)
        .filter(Experiment.owner_id == owner_id)
        .order_by(Experiment.updated_at.desc())
        .all()
    )

    total = len(exps)
    by_status = {s.value: 0 for s in ExperimentStatus}
    for e in exps:
        by_status[e.status.value] += 1

    reports = (
        db.query(Report)
        .join(Experiment, Report.experiment_id == Experiment.id)
        .filter(Experiment.owner_id == owner_id)
        .all()
    )
    successful_launches = sum(1 for r in reports if r.decision == DecisionType.LAUNCH.value)

    # Average lift across primary metrics of analysed experiments.
    primary_results = (
        db.query(StatisticalResult)
        .join(Experiment, StatisticalResult.experiment_id == Experiment.id)
        .filter(Experiment.owner_id == owner_id, StatisticalResult.is_primary.is_(True))
        .all()
    )
    avg_lift = (
        sum(r.relative_lift_pct for r in primary_results) / len(primary_results)
        if primary_results else 0.0
    )
    win_rate = (
        sum(1 for r in primary_results if r.significant and r.relative_lift_pct > 0)
        / len(primary_results) * 100
        if primary_results else 0.0
    )

    # Revenue impact = sum of projected annual revenue from launch-worthy reports.
    revenue_impact = 0.0
    for r in reports:
        proj = (r.sections or {}).get("projected_annual_revenue", 0.0)
        if r.decision == DecisionType.LAUNCH.value and proj > 0:
            revenue_impact += proj

    # Recent experiments (lightweight cards).
    recent = []
    for e in exps[:6]:
        primary = next((s for s in e.statistical_results if s.is_primary), None)
        recent.append({
            "id": e.id,
            "name": e.name,
            "area": e.area,
            "status": e.status.value,
            "primary_metric_key": e.primary_metric_key,
            "lift_pct": primary.relative_lift_pct if primary else None,
            "significant": primary.significant if primary else None,
            "decision": e.report.decision if e.report else None,
            "updated_at": e.updated_at.isoformat(),
        })

    # Decision distribution for a donut chart.
    decision_counts: dict[str, int] = {}
    for r in reports:
        decision_counts[r.decision] = decision_counts.get(r.decision, 0) + 1

    # Lift by product area for a bar chart.
    area_lift: dict[str, list[float]] = {}
    for r in primary_results:
        area = next((e.area for e in exps if e.id == r.experiment_id), "Other")
        area_lift.setdefault(area, []).append(r.relative_lift_pct)
    area_summary = [
        {"area": a, "avg_lift": round(sum(v) / len(v), 2), "count": len(v)}
        for a, v in area_lift.items()
    ]

    return {
        "totals": {
            "total_experiments": total,
            "active_experiments": by_status[ExperimentStatus.RUNNING.value],
            "running_experiments": by_status[ExperimentStatus.RUNNING.value],
            "completed_experiments": by_status[ExperimentStatus.COMPLETED.value],
            "draft_experiments": by_status[ExperimentStatus.DRAFT.value],
            "archived_experiments": by_status[ExperimentStatus.ARCHIVED.value],
            "successful_launches": successful_launches,
            "average_lift_pct": round(avg_lift, 2),
            "win_rate_pct": round(win_rate, 1),
            "revenue_impact": round(revenue_impact, 0),
        },
        "recent_experiments": recent,
        "decision_distribution": decision_counts,
        "area_summary": area_summary,
    }
