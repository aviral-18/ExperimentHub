"""Launch Decision Engine.

Turns statistical output + business context into one of five recommendations:
LAUNCH, ITERATE (keep running), ROLLBACK, STOP, or INCONCLUSIVE. The logic
mirrors how a disciplined experimentation team actually decides — significance
alone is never enough; power, effect size, guardrail metrics and projected
revenue all feed in.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.models.result import DecisionType
from app.statistics.engine import MetricAnalysis

# Metrics that must not regress even if the primary metric wins — a launch that
# lifts conversion while cratering revenue or satisfaction is a bad launch.
GUARDRAIL_METRICS = ["arpu", "revenue_per_visitor", "retention", "customer_satisfaction"]


@dataclass
class DecisionFactor:
    label: str
    value: str
    status: str          # "positive" | "neutral" | "negative"
    detail: str
    weight: float = 1.0


@dataclass
class DecisionOutput:
    decision: DecisionType
    confidence_score: float          # 0..100 composite confidence in the call
    headline: str
    projected_annual_revenue: float  # ₹ if rolled out to 100% traffic
    factors: list[DecisionFactor] = field(default_factory=list)

    def factors_as_dict(self) -> list[dict]:
        return [f.__dict__ for f in self.factors]


def _guardrail_regressions(analyses: dict[str, MetricAnalysis]) -> list[MetricAnalysis]:
    out = []
    for key in GUARDRAIL_METRICS:
        a = analyses.get(key)
        if a and a.significant and not a.is_improvement:
            out.append(a)
    return out


def project_annual_revenue(
    analyses: dict[str, MetricAnalysis], total_users: int,
    traffic_allocation: float, duration_days: int,
) -> float:
    """Extrapolate the ARPU difference to a full-traffic annual figure."""
    arpu = analyses.get("arpu")
    if arpu is None:
        return 0.0
    per_user_delta = arpu.absolute_diff  # ₹ per assigned user over the window
    full_traffic_users = total_users / max(traffic_allocation, 0.01)
    daily_users = full_traffic_users / max(duration_days, 1)
    return float(daily_users * 365 * per_user_delta)


def decide(
    primary: MetricAnalysis,
    analyses: dict[str, MetricAnalysis],
    total_users: int,
    traffic_allocation: float,
    duration_days: int,
    expected_lift_pct: float,
) -> DecisionOutput:
    guardrails = _guardrail_regressions(analyses)
    projected_rev = project_annual_revenue(analyses, total_users, traffic_allocation, duration_days)

    sig = primary.significant
    improved = primary.is_improvement
    powered = primary.achieved_power >= 0.8
    material = abs(primary.relative_lift_pct) >= max(1.0, 0.3 * expected_lift_pct)

    # Was the test *designed* sensitively enough to detect the effect we cared
    # about? Compare the minimum detectable effect (at the target power for this
    # sample size) with the expected lift. This is the statistically correct way
    # to tell a "well-powered null" (STOP) from an "under-powered null" (ITERATE)
    # — post-hoc power on the observed effect is misleading for a null result.
    mde_rel = (
        abs(primary.mde_abs / primary.control_value * 100)
        if primary.control_value else float("inf")
    )
    sensitive = mde_rel <= 0.7 * max(expected_lift_pct, 1.0)

    # --- Core decision tree ---------------------------------------------- #
    if sig and improved and guardrails:
        decision = DecisionType.ITERATE
        headline = (
            "Primary metric improved, but a guardrail metric significantly "
            "regressed — investigate before launching."
        )
    elif sig and improved and powered and material:
        decision = DecisionType.LAUNCH
        headline = "Statistically significant, well-powered improvement — recommend launch."
    elif sig and improved and material:
        decision = DecisionType.LAUNCH
        headline = "Significant improvement detected — recommend launch, monitor power."
    elif sig and improved:
        decision = DecisionType.ITERATE
        headline = "Significant but tiny effect — iterate to find a more meaningful win."
    elif sig and not improved:
        decision = DecisionType.ROLLBACK
        headline = "Treatment significantly underperforms control — do not ship / roll back."
    elif not sig and sensitive:
        decision = DecisionType.STOP
        headline = "Well-powered test found no meaningful effect — stop and free up the traffic."
    elif not sig and improved:
        decision = DecisionType.ITERATE
        headline = "Promising but under-powered — keep running to reach significance."
    else:
        decision = DecisionType.STOP
        headline = "No evidence of a positive effect — stop the experiment."

    confidence = _confidence_score(primary, guardrails, decision)
    factors = _build_factors(primary, analyses, guardrails, projected_rev, powered, material)

    return DecisionOutput(
        decision=decision,
        confidence_score=confidence,
        headline=headline,
        projected_annual_revenue=projected_rev,
        factors=factors,
    )


def _confidence_score(primary, guardrails, decision) -> float:
    """0..100 composite of how confident we are in the *recommendation*."""
    # Evidence strength from p-value (capped) and power.
    p = primary.p_value
    sig_component = max(0.0, min(1.0, 1 - (p / 0.05))) if p < 0.05 else max(0.0, 0.5 - p)
    power_component = min(primary.achieved_power, 1.0)
    effect_component = min(abs(primary.effect_size) / 0.5, 1.0)
    guardrail_penalty = 0.25 * len(guardrails)

    base = 0.5 * sig_component + 0.3 * power_component + 0.2 * effect_component
    score = max(0.0, base - guardrail_penalty) * 100
    # Clear STOP/ROLLBACK calls on strong evidence are themselves high-confidence.
    if decision in (DecisionType.ROLLBACK, DecisionType.STOP) and primary.achieved_power >= 0.8:
        score = max(score, 70.0)
    return round(min(score, 99.0), 1)


def _build_factors(primary, analyses, guardrails, projected_rev, powered, material) -> list[DecisionFactor]:
    factors: list[DecisionFactor] = []

    factors.append(DecisionFactor(
        label="Statistical Significance",
        value=f"p = {primary.p_value:.4f}",
        status="positive" if primary.significant else "negative",
        detail=("Below the significance threshold — the effect is unlikely to be noise."
                if primary.significant else
                "Above threshold — cannot rule out random chance."),
        weight=0.30,
    ))
    factors.append(DecisionFactor(
        label="Statistical Power",
        value=f"{primary.achieved_power * 100:.0f}%",
        status="positive" if powered else "negative",
        detail=("At or above the 80% convention — the test could reliably detect the effect."
                if powered else
                "Below 80% — the test may be too small to trust a null result."),
        weight=0.20,
    ))
    factors.append(DecisionFactor(
        label="Effect Size",
        value=f"{primary.effect_label.title()} ({primary.effect_size:+.3f})",
        status="positive" if abs(primary.effect_size) >= 0.2 and primary.is_improvement else "neutral",
        detail="Practical magnitude of the change, independent of sample size.",
        weight=0.15,
    ))
    factors.append(DecisionFactor(
        label="Relative Lift",
        value=f"{primary.relative_lift_pct:+.1f}%",
        status="positive" if primary.is_improvement and material else
               ("negative" if not primary.is_improvement else "neutral"),
        detail="Change in the primary metric versus control.",
        weight=0.15,
    ))
    rev_status = "positive" if projected_rev > 0 else ("negative" if projected_rev < 0 else "neutral")
    factors.append(DecisionFactor(
        label="Projected Annual Revenue",
        value=f"₹{projected_rev:,.0f}",
        status=rev_status,
        detail="Extrapolated ARPU impact at 100% traffic over 12 months.",
        weight=0.20,
    ))
    if guardrails:
        names = ", ".join(a.metric_key.replace("_", " ").title() for a in guardrails)
        factors.append(DecisionFactor(
            label="Guardrail Alert",
            value=f"{len(guardrails)} regressed",
            status="negative",
            detail=f"These guardrail metrics dropped significantly: {names}.",
            weight=0.25,
        ))
    else:
        factors.append(DecisionFactor(
            label="Guardrail Health",
            value="All clear",
            status="positive",
            detail="No guardrail metric regressed significantly.",
            weight=0.10,
        ))
    return factors
