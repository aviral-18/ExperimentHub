"""Report export routes (server-side CSV). Excel/PDF are produced client-side."""
from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.experiment import Experiment
from app.models.result import StatisticalResult
from app.models.user import User

router = APIRouter(prefix="/experiments", tags=["reports"])


def _get_owned(db: Session, exp_id: int, user: User) -> Experiment:
    exp = db.get(Experiment, exp_id)
    if exp is None or exp.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.get("/{exp_id}/export.csv")
def export_csv(
    exp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> StreamingResponse:
    exp = _get_owned(db, exp_id, user)
    rows = (
        db.query(StatisticalResult)
        .filter(StatisticalResult.experiment_id == exp.id)
        .order_by(StatisticalResult.is_primary.desc())
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="No results to export. Run the experiment first.")

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "metric", "is_primary", "test", "control", "treatment", "absolute_diff",
        "relative_lift_pct", "p_value", "significant", "ci_low", "ci_high",
        "effect_size", "effect_label", "achieved_power", "required_sample_per_arm",
    ])
    for r in rows:
        writer.writerow([
            r.metric_key, r.is_primary, r.test_name,
            f"{r.control_value:.6f}", f"{r.treatment_value:.6f}",
            f"{r.absolute_diff:.6f}", f"{r.relative_lift_pct:.4f}",
            f"{r.p_value:.6f}", r.significant, f"{r.ci_low:.6f}", f"{r.ci_high:.6f}",
            f"{r.effect_size:.6f}", r.effect_label, f"{r.achieved_power:.4f}",
            r.required_sample_per_arm,
        ])
    buffer.seek(0)
    filename = f"{exp.key}-results.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
