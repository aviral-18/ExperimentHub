"""Database seeding.

Creates a demo user and a realistic portfolio of experiments spanning every
decision outcome (launch, rollback, stop, iterate) so the dashboard, history and
analysis views are populated and interesting from the very first load.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.experiment import ExperimentStatus
from app.models.user import User
from app.schemas.experiment import ExperimentCreate
from app.services import analysis_service, experiment_service
from app.utils.templates import EXPERIMENT_TEMPLATES

DEMO_EMAIL = "demo@experimentos.io"
DEMO_PASSWORD = "demo1234"

# template_id -> (true_effect_pct, total_users, duration_days, status, run?)
# Effects are chosen to produce a spread of realistic decisions.
_PORTFOLIO = [
    ("checkout",          6.0, 120_000, 14, ExperimentStatus.COMPLETED, True),   # clear LAUNCH
    ("payment-flow",      8.5, 140_000, 10, ExperimentStatus.COMPLETED, True),   # strong LAUNCH
    ("recommendations",   5.5, 160_000, 21, ExperimentStatus.COMPLETED, True),   # LAUNCH
    ("coupon-ui",         9.0, 110_000, 14, ExperimentStatus.COMPLETED, True),   # LAUNCH
    ("menu-design",       6.5,  90_000, 14, ExperimentStatus.RUNNING,   True),   # interim (running)
    ("ranking",           3.0, 100_000, 14, ExperimentStatus.COMPLETED, True),   # LAUNCH/ITERATE
    ("search",            1.2,  28_000, 10, ExperimentStatus.COMPLETED, True),   # under-powered ITERATE
    ("homepage",          0.0, 200_000, 14, ExperimentStatus.COMPLETED, True),   # well-powered STOP
    ("delivery-fee",     -6.0, 150_000, 14, ExperimentStatus.COMPLETED, True),   # regression ROLLBACK
    ("restaurant-cards",  5.0,  80_000, 14, ExperimentStatus.DRAFT,     False),  # draft, not run
]


def _template(tid: str) -> dict:
    return next(t for t in EXPERIMENT_TEMPLATES if t["id"] == tid)


def _payload(t: dict, effect: float, users: int, days: int) -> ExperimentCreate:
    return ExperimentCreate(
        name=t["name"],
        description=t["hypothesis"],
        hypothesis=t["hypothesis"],
        business_objective=t["business_objective"],
        success_criteria=t["success_criteria"],
        area=t["area"],
        primary_metric_key=t["primary_metric_key"],
        secondary_metric_keys=t["secondary_metric_keys"],
        control_name=t["control_name"],
        treatment_name=t["treatment_name"],
        treatment_true_effect_pct=effect,
        traffic_allocation=1.0,
        control_split=0.5,
        expected_lift_pct=max(abs(t.get("suggested_effect_pct", 5.0)), 1.0),
        confidence_level=0.95,
        power=0.8,
        duration_days=days,
        total_users=users,
    )


def seed_database(db: Session) -> User:
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user is None:
        user = User(
            email=DEMO_EMAIL,
            full_name="Aarav Sharma",
            role="Principal Product Manager",
            hashed_password=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    for tid, effect, users, days, status, run in _PORTFOLIO:
        t = _template(tid)
        exp = experiment_service.create_experiment(db, user.id, _payload(t, effect, users, days))
        if run:
            analysis_service.run_analysis(db, exp)
        # Apply the desired display status (analysis sets COMPLETED by default).
        exp.status = status
        db.commit()

    return user


if __name__ == "__main__":
    from app.database.session import Base, SessionLocal, engine
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        seed_database(session)
        print(f"Seeded demo data. Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        session.close()
