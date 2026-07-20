"""SQLAlchemy models.

Importing every model here ensures they are registered on ``Base.metadata``
before ``create_all`` runs, regardless of import order elsewhere.
"""
from app.models.user import User  # noqa: F401
from app.models.experiment import Experiment, ExperimentStatus  # noqa: F401
from app.models.variant import Variant, VariantRole  # noqa: F401
from app.models.metric import (  # noqa: F401
    MetricDefinition,
    MetricType,
    MetricGoal,
)
from app.models.simulation import (  # noqa: F401
    SimulationRun,
    SimulationStatus,
    VariantMetricResult,
    SegmentResult,
)
from app.models.result import StatisticalResult, DecisionType  # noqa: F401
from app.models.report import Report  # noqa: F401

__all__ = [
    "User",
    "Experiment",
    "ExperimentStatus",
    "Variant",
    "VariantRole",
    "MetricDefinition",
    "MetricType",
    "MetricGoal",
    "SimulationRun",
    "SimulationStatus",
    "VariantMetricResult",
    "SegmentResult",
    "StatisticalResult",
    "DecisionType",
    "Report",
]
