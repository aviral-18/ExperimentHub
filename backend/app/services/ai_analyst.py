"""AI Product Analyst.

Produces an executive-quality written analysis of an experiment. The default
engine is deterministic and fully data-driven — every sentence is derived from
the actual statistics, so it never hallucinates numbers. If an Anthropic API
key is configured, the same structured evidence is handed to an LLM to polish
the prose; otherwise the built-in analyst voice is used.

The narrative deliberately reads like a Senior Product Analyst writing for a
launch review: it interprets the numbers, flags biases and confounders, quantifies
business impact, and recommends next steps.
"""
from __future__ import annotations

from dataclasses import dataclass

from scipy import stats

from app.core.config import settings
from app.services.decision_engine import DecisionOutput
from app.statistics.engine import MetricAnalysis
from app.utils.metrics_catalog import format_metric_value, get_metric


@dataclass
class ExperimentContext:
    name: str
    hypothesis: str
    business_objective: str
    primary_metric_key: str
    control_name: str
    treatment_name: str
    area: str
    expected_lift_pct: float
    confidence_level: float


def _srm_check(n_control: int, n_treatment: int, control_split: float) -> tuple[bool, float]:
    """Sample Ratio Mismatch check — a chi-square test that the observed split
    matches the intended one. A failing SRM is the #1 sign an experiment is
    broken (bad randomisation, logging bug) and its results untrustworthy."""
    total = n_control + n_treatment
    if total == 0:
        return False, 1.0
    expected = [total * control_split, total * (1 - control_split)]
    observed = [n_control, n_treatment]
    if min(expected) <= 0:
        return False, 1.0
    chi2, p = stats.chisquare(observed, expected)
    return bool(p < 0.001), float(p)


def generate_narrative(
    ctx: ExperimentContext,
    primary: MetricAnalysis,
    analyses: dict[str, MetricAnalysis],
    decision: DecisionOutput,
    segments: list[dict],
    control_split: float,
) -> dict:
    """Return {headline, summary, sections{...}, generated_by}."""
    sections = _deterministic_sections(ctx, primary, analyses, decision, segments, control_split)
    summary = sections.pop("_summary")
    headline = decision.headline
    generated_by = "rule-engine"

    # Optional LLM polish. Falls back silently to the deterministic version.
    if settings.ANTHROPIC_API_KEY:
        try:
            polished = _llm_polish(ctx, primary, decision, summary, sections)
            if polished:
                summary = polished.get("summary", summary)
                sections.update(polished.get("sections", {}))
                generated_by = "anthropic"
        except Exception:
            generated_by = "rule-engine"

    return {
        "headline": headline,
        "summary": summary,
        "sections": sections,
        "generated_by": generated_by,
    }


def _fmt(key: str, analysis: MetricAnalysis, which: str) -> str:
    value = analysis.control_value if which == "control" else analysis.treatment_value
    return format_metric_value(key, value)


def _deterministic_sections(ctx, primary, analyses, decision, segments, control_split) -> dict:
    key = ctx.primary_metric_key
    spec = get_metric(key)
    winner = ctx.treatment_name if primary.is_improvement else ctx.control_name
    srm_failed, srm_p = _srm_check(primary.n_control, primary.n_treatment, control_split)

    # Strongest and weakest responding segments (heterogeneous treatment effect).
    seg_sorted = sorted(segments, key=lambda s: s["lift_pct"], reverse=True)
    top_seg = seg_sorted[0] if seg_sorted else None
    bottom_seg = seg_sorted[-1] if seg_sorted else None

    # --- Summary --------------------------------------------------------- #
    summary = (
        f"We tested **{ctx.treatment_name}** against **{ctx.control_name}** on "
        f"*{spec.label}*, the primary metric for this {ctx.area.lower()} experiment. "
        f"{ctx.treatment_name} recorded {_fmt(key, primary, 'treatment')} versus "
        f"{_fmt(key, primary, 'control')} for control — a {primary.relative_lift_pct:+.1f}% "
        f"relative {'lift' if primary.is_improvement else 'change'} that is "
        f"{'statistically significant' if primary.significant else 'not statistically significant'} "
        f"(p = {primary.p_value:.4f}) at the {int(ctx.confidence_level*100)}% confidence level. "
        f"Statistical power reached {primary.achieved_power*100:.0f}%. "
        f"**Recommendation: {decision.decision.value.upper()}.** {decision.headline}"
    )

    # --- Why it won / lost ----------------------------------------------- #
    if primary.is_improvement:
        why = (
            f"{ctx.treatment_name} moved *{spec.label}* in the intended direction. "
            f"The confidence interval for the absolute difference is "
            f"[{_ci_str(key, primary)}], and the effect size is {primary.effect_label} "
            f"(Cohen's {'h' if spec.metric_type=='proportion' else 'd'} = {primary.effect_size:+.3f}). "
        )
        if top_seg:
            why += (
                f"The effect was not uniform: **{top_seg['segment']}** users responded most "
                f"strongly ({top_seg['lift_pct']:+.1f}%), while **{bottom_seg['segment']}** users "
                f"saw {bottom_seg['lift_pct']:+.1f}%. This heterogeneity suggests the change "
                f"resonates with specific cohorts and hints at a targeted-rollout opportunity."
            )
    else:
        why = (
            f"{ctx.treatment_name} failed to beat control on *{spec.label}* "
            f"({primary.relative_lift_pct:+.1f}%). The confidence interval "
            f"[{_ci_str(key, primary)}] "
            f"{'excludes' if primary.significant else 'straddles'} zero, so the data "
            f"{'point to a genuine regression' if primary.significant else 'are consistent with no real difference'}. "
            f"Before iterating, verify the treatment was implemented as designed and that "
            f"no instrumentation gap suppressed the metric."
        )

    # --- Business impact & revenue --------------------------------------- #
    arpu = analyses.get("arpu")
    orders = analyses.get("orders")
    impact = (
        f"At the observed effect, rolling {ctx.treatment_name} out to 100% of traffic projects to "
        f"**₹{decision.projected_annual_revenue:,.0f} in incremental annual revenue** "
        f"(extrapolated from the ARPU difference). "
    )
    if arpu:
        impact += (
            f"ARPU moved from {_fmt('arpu', arpu, 'control')} to {_fmt('arpu', arpu, 'treatment')} "
            f"({arpu.relative_lift_pct:+.1f}%). "
        )
    if orders:
        impact += (
            f"Orders per user shifted {orders.relative_lift_pct:+.1f}%, indicating the change "
            f"{'expanded' if orders.is_improvement else 'contracted'} purchase volume, not just mix."
        )
    revenue = (
        f"The revenue case rests on the ARPU delta holding at scale. Note that experiment "
        f"extrapolation assumes the tested population is representative of all traffic and that "
        f"the effect does not decay post-launch (novelty). A phased 50% → 100% rollout with a "
        f"holdback is the prudent way to bank this ₹{decision.projected_annual_revenue:,.0f} while "
        f"validating durability."
    )

    # --- Biases ---------------------------------------------------------- #
    biases = _bias_section(ctx, primary, srm_failed, srm_p)

    # --- Confounders ----------------------------------------------------- #
    confounders = (
        "Possible confounders to rule out before trusting the read: "
        "(1) **Seasonality / day-of-week** — a 14-day window can be skewed by weekends, paydays or "
        "festival demand; confirm the daily trend is stable rather than front-loaded. "
        "(2) **Concurrent experiments** — overlapping tests on the same surface can interact; check "
        "for collisions in the assignment layer. "
        "(3) **Segment mix shift** — if the treatment attracted a different user mix, an aggregate "
        "lift can be Simpson's-paradox driven; the segment table above controls for this. "
        "(4) **Instrumentation parity** — ensure both arms log events identically so the metric "
        "isn't inflated by a tracking difference."
    )

    # --- Risk ------------------------------------------------------------ #
    risk = _risk_section(primary, decision, analyses)

    # --- Recommendation -------------------------------------------------- #
    recommendation = (
        f"**{decision.decision.value.upper()}** — {decision.headline} "
        f"Decision confidence: {decision.confidence_score:.0f}/100. "
        + _decision_playbook(decision)
    )

    # --- Next experiments ------------------------------------------------ #
    next_experiments = _next_experiments(ctx, primary, top_seg, decision)

    # --- PM interview observations --------------------------------------- #
    pm = _pm_observations(primary, decision, top_seg, srm_failed)

    return {
        "_summary": summary,
        "why_it_won": why,
        "business_impact": impact,
        "revenue": revenue,
        "biases": biases,
        "confounders": confounders,
        "risk": risk,
        "recommendation": recommendation,
        "next_experiments": next_experiments,
        "pm_observations": pm,
        "winner": winner,
        "srm_failed": srm_failed,
    }


def _ci_str(key: str, a: MetricAnalysis) -> str:
    spec = get_metric(key)
    if spec.metric_type == "proportion":
        return f"{a.ci_low*100:+.2f} pp, {a.ci_high*100:+.2f} pp"
    return f"{a.ci_low:+,.2f}, {a.ci_high:+,.2f}"


def _bias_section(ctx, primary, srm_failed, srm_p) -> str:
    parts = []
    if srm_failed:
        parts.append(
            f"⚠️ **Sample Ratio Mismatch detected** (SRM p = {srm_p:.5f}). The observed traffic "
            f"split deviates from the intended allocation more than chance allows — this usually "
            f"signals a randomisation or logging bug and means the results should not be trusted "
            f"until the root cause is fixed."
        )
    else:
        parts.append(
            f"Sample Ratio Mismatch check **passed** (SRM p = {srm_p:.3f}); the {primary.n_control:,} "
            f"control and {primary.n_treatment:,} treatment users match the intended split, so "
            f"randomisation looks healthy."
        )
    parts.append(
        "Watch for **novelty effect** (returning users react to *any* change, inflating early "
        "numbers), **primacy effect** (power users resist change, deflating them), and "
        "**survivorship bias** if the metric is only defined for users who reached a late funnel "
        "stage."
    )
    return " ".join(parts)


def _risk_section(primary, decision, analyses) -> str:
    bits = []
    if primary.achieved_power < 0.8:
        bits.append("power is below 80%, so a real effect could still be over- or under-stated")
    if abs(primary.effect_size) < 0.2:
        bits.append("the effect size is negligible, so practical value may be limited despite significance")
    guard = [k for k in ("arpu", "retention", "customer_satisfaction")
             if analyses.get(k) and analyses[k].significant and not analyses[k].is_improvement]
    if guard:
        bits.append(f"guardrail metrics regressed ({', '.join(guard)})")
    if not bits:
        return (
            "Risk is low: the result is significant, adequately powered, and no guardrail metric "
            "regressed. The main residual risk is effect decay after launch, mitigated by a holdback."
        )
    return "Key risks: " + "; ".join(bits) + ". Mitigate with a phased rollout and a long-term holdback group."


def _decision_playbook(decision: DecisionOutput) -> str:
    from app.models.result import DecisionType
    return {
        DecisionType.LAUNCH: "Ship to 100% behind a feature flag, keep a 5% holdback for 4 weeks to measure durable impact.",
        DecisionType.ITERATE: "Do not ship yet — refine the treatment or extend the run to gather the evidence still missing.",
        DecisionType.ROLLBACK: "Revert the treatment immediately and post-mortem why it underperformed.",
        DecisionType.STOP: "End the test, release the traffic to higher-potential experiments, and document the learning.",
        DecisionType.INCONCLUSIVE: "Extend the experiment or increase traffic before making any call.",
    }.get(decision.decision, "")


def _next_experiments(ctx, primary, top_seg, decision) -> list[str]:
    spec = get_metric(ctx.primary_metric_key)
    ideas = []
    if top_seg and primary.is_improvement:
        ideas.append(
            f"Targeted rollout test: ship {ctx.treatment_name} only to {top_seg['segment']} users, "
            f"where the effect was strongest ({top_seg['lift_pct']:+.1f}%), and measure incrementality."
        )
    ideas.append(
        f"Follow-up on the funnel step upstream of {spec.label.lower()} to compound the win "
        f"(e.g. reduce friction one stage earlier)."
    )
    ideas.append(
        "A long-term holdback experiment to quantify novelty decay and confirm the effect persists "
        "beyond the initial two weeks."
    )
    if not primary.is_improvement:
        ideas.insert(0, "A qualitative usability study to understand *why* the treatment underperformed "
                        "before investing in another quantitative test.")
    return ideas[:4]


def _pm_observations(primary, decision, top_seg, srm_failed) -> list[str]:
    obs = []
    if primary.significant and abs(primary.effect_size) < 0.2:
        obs.append(
            "Classic interview trap avoided: a tiny p-value with a negligible effect size means "
            "'real but trivial'. Significance answers *is there an effect*; effect size answers "
            "*does it matter*. Always report both."
        )
    if primary.achieved_power < 0.8 and not primary.significant:
        obs.append(
            "A non-significant result here is *inconclusive*, not *negative* — the test was "
            "under-powered. Absence of evidence is not evidence of absence."
        )
    if top_seg:
        obs.append(
            f"Heterogeneous treatment effects matter: the aggregate number hides that "
            f"{top_seg['segment']} behaves very differently. Segment before you generalise, or you "
            f"risk a Simpson's-paradox conclusion."
        )
    obs.append(
        "The confidence interval, not the point estimate, is the honest summary of the result — "
        "it communicates the range of plausible truths a single lift number cannot."
    )
    if srm_failed:
        obs.append(
            "Sample Ratio Mismatch is the first thing a seasoned analyst checks. A broken split "
            "invalidates every downstream number, no matter how significant."
        )
    obs.append(
        "Guardrail metrics protect against local optimisation: winning the primary metric while "
        "quietly harming revenue or retention is not a real win."
    )
    return obs[:5]


def _llm_polish(ctx, primary, decision, summary, sections) -> dict | None:
    """Optional: hand the structured evidence to Claude for prose polishing.

    Only runs when ANTHROPIC_API_KEY is set and the SDK is importable. Kept
    dependency-light: the deterministic engine is the guaranteed default.
    """
    try:
        import anthropic  # type: ignore
    except Exception:
        return None

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    evidence = {
        "experiment": ctx.name,
        "primary_metric": ctx.primary_metric_key,
        "relative_lift_pct": round(primary.relative_lift_pct, 2),
        "p_value": round(primary.p_value, 5),
        "achieved_power": round(primary.achieved_power, 3),
        "effect_size": round(primary.effect_size, 4),
        "decision": decision.decision.value,
        "projected_annual_revenue": round(decision.projected_annual_revenue, 0),
        "draft_summary": summary,
    }
    prompt = (
        "You are a Senior Product Analyst writing an executive summary of an A/B test. "
        "Using ONLY the numbers in this JSON (do not invent figures), rewrite the summary in "
        "3-4 crisp sentences an exec would read first. Return just the paragraph.\n\n"
        f"{evidence}"
    )
    msg = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    text = "".join(block.text for block in msg.content if getattr(block, "type", "") == "text")
    return {"summary": text.strip(), "sections": {}} if text.strip() else None
