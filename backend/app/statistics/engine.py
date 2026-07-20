"""High-level analysis engine.

``analyze_metric`` takes the aggregated observations for one metric (control vs
treatment) and returns a complete, self-describing analysis: point estimates,
the correct hypothesis test, a confidence interval, effect size, power
diagnostics and a plain-English explanation of what it all means.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict

from app.statistics import effect_size as es
from app.statistics import power as pw
from app.statistics import tests as ts


@dataclass
class MetricObservation:
    """Aggregated numbers the engine needs, per arm."""
    n: int
    mean: float          # proportion (0..1) for rate metrics, else the mean
    std: float           # standard deviation (proportions: sqrt(p(1-p)))
    successes: int = 0   # only used for proportions


@dataclass
class MetricAnalysis:
    metric_key: str
    metric_type: str            # "proportion" | "mean"
    goal: str                   # "increase" | "decrease"
    test_name: str
    control_value: float
    treatment_value: float
    absolute_diff: float
    relative_lift_pct: float
    statistic: float
    p_value: float
    ci_low: float
    ci_high: float
    ci_level: float
    effect_size: float
    effect_label: str
    achieved_power: float
    mde_abs: float
    required_sample_per_arm: int
    significant: bool
    is_improvement: bool        # did it move in the desired direction?
    explanation: str
    n_control: int = 0
    n_treatment: int = 0
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def _pct(x: float) -> str:
    return f"{x * 100:.2f}%"


def analyze_metric(
    metric_key: str,
    metric_type: str,
    goal: str,
    control: MetricObservation,
    treatment: MetricObservation,
    confidence: float = 0.95,
    power_target: float = 0.8,
) -> MetricAnalysis:
    alpha = 1 - confidence
    c_val, t_val = control.mean, treatment.mean
    abs_diff = t_val - c_val
    rel_lift = (abs_diff / c_val * 100) if c_val != 0 else 0.0

    warnings: list[str] = []

    if metric_type == "proportion":
        res = ts.two_proportion_z_test(
            control.successes, control.n, treatment.successes, treatment.n, confidence
        )
        eff = es.cohens_h(c_val, t_val)
        achieved = pw.proportion_power(c_val, t_val, min(control.n, treatment.n), alpha)
        mde = pw.proportion_mde_absolute(c_val, min(control.n, treatment.n), alpha, power_target)
        # sample size to detect the *observed* relative lift
        req = pw.proportion_sample_size(
            c_val, abs(rel_lift) / 100 if rel_lift != 0 else 0.01, alpha, power_target
        )
    else:
        res = ts.two_sample_t_test(
            c_val, control.std, control.n, t_val, treatment.std, treatment.n, confidence
        )
        eff = es.cohens_d(c_val, control.std, control.n, t_val, treatment.std, treatment.n)
        achieved = pw.mean_power(eff, min(control.n, treatment.n), alpha)
        mde = pw.mean_mde_absolute(
            (control.std + treatment.std) / 2, min(control.n, treatment.n), alpha, power_target
        )
        req = pw.mean_sample_size(eff, alpha, power_target)

    significant = res.p_value < alpha
    # "Improvement" depends on whether higher or lower is better for this metric.
    is_improvement = abs_diff > 0 if goal == "increase" else abs_diff < 0

    # --- Guardrails / data-quality warnings ------------------------------- #
    if significant and achieved < 0.8:
        warnings.append(
            "Result is significant but statistical power is below 80% — treat the "
            "magnitude with caution and consider more traffic."
        )
    if not significant and achieved < 0.8:
        warnings.append(
            "Non-significant result is under-powered: absence of evidence here is "
            "not evidence of absence. The test may simply be too small."
        )
    if abs(eff) < 0.2 and significant:
        warnings.append(
            "Statistically significant but the effect size is negligible — the "
            "change may not be practically meaningful."
        )

    explanation = _build_explanation(
        metric_key, metric_type, res, c_val, t_val, rel_lift, significant,
        confidence, achieved, eff, is_improvement, goal,
    )

    return MetricAnalysis(
        metric_key=metric_key,
        metric_type=metric_type,
        goal=goal,
        test_name=res.test_name,
        control_value=c_val,
        treatment_value=t_val,
        absolute_diff=abs_diff,
        relative_lift_pct=rel_lift,
        statistic=res.statistic,
        p_value=res.p_value,
        ci_low=res.ci_low,
        ci_high=res.ci_high,
        ci_level=confidence,
        effect_size=eff,
        effect_label=es.effect_label(eff),
        achieved_power=achieved,
        mde_abs=mde,
        required_sample_per_arm=req,
        significant=significant,
        is_improvement=is_improvement,
        explanation=explanation,
        n_control=control.n,
        n_treatment=treatment.n,
        warnings=warnings,
    )


def _build_explanation(
    metric_key, metric_type, res, c_val, t_val, rel_lift, significant,
    confidence, achieved, eff, is_improvement, goal,
) -> str:
    """Compose a human-readable paragraph an analyst could paste into a doc."""
    conf_pct = int(round(confidence * 100))
    direction = "higher" if t_val > c_val else "lower"

    if metric_type == "proportion":
        obs = (
            f"Treatment converted at {_pct(t_val)} versus {_pct(c_val)} for control "
            f"({direction} by {abs(t_val - c_val) * 100:.2f} percentage points, "
            f"a {rel_lift:+.1f}% relative change)."
        )
        ci = (
            f"We are {conf_pct}% confident the true difference lies between "
            f"{res.ci_low * 100:+.2f} and {res.ci_high * 100:+.2f} percentage points."
        )
    else:
        obs = (
            f"Treatment averaged {t_val:,.2f} versus {c_val:,.2f} for control "
            f"({direction} by {abs(t_val - c_val):,.2f}, a {rel_lift:+.1f}% change)."
        )
        ci = (
            f"We are {conf_pct}% confident the true difference lies between "
            f"{res.ci_low:+,.2f} and {res.ci_high:+,.2f}."
        )

    if significant:
        sig = (
            f"This is statistically significant (p = {res.p_value:.4f} < "
            f"{1 - confidence:.2f}): if the variants were truly identical, a gap this "
            f"large would appear less than {max(res.p_value, 1e-4) * 100:.2f}% of the time."
        )
    else:
        sig = (
            f"This is not statistically significant (p = {res.p_value:.4f} ≥ "
            f"{1 - confidence:.2f}): the observed gap is well within the range we'd "
            f"expect from random noise, so we cannot conclude the variants differ."
        )

    power_note = (
        f"Statistical power was {achieved * 100:.0f}%."
        + ("" if achieved >= 0.8 else " Below the 80% convention — interpret cautiously.")
    )
    return f"{obs} {sig} {ci} {power_note}"
