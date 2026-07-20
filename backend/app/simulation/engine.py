"""Vectorised synthetic-user simulation engine.

Given an experiment's design (traffic split, duration, primary metric, and the
treatment's *true* effect), this generates ~100k heterogeneous users, samples a
coherent behavioural funnel for each, applies the treatment effect with
segment-level heterogeneity, and returns fully aggregated results:

* per-variant × per-metric aggregates (n, mean, std, successes, total)
* per-segment breakdowns of the primary metric (with quick significance)
* a per-day time-series of the primary metric
* the conversion funnel per variant
* distribution histograms for continuous metrics

Everything is vectorised with NumPy, so 100k users run in well under a second.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

import numpy as np

from app.simulation import segments as seg
from app.statistics import tests as ts
from app.utils.metrics_catalog import METRIC_SPECS, get_metric

# Which latent levers each primary metric drives, and by how much (signed).
# Positive weight → the treatment pushes the lever up; negative → down. The
# secondary levers create realistic, coherent movement across correlated
# metrics (e.g. a checkout win also lifts revenue and trims cart abandonment).
PRIMARY_LEVER_MAP: dict[str, list[tuple[str, float]]] = {
    "conversion_rate": [("convert", 1.0), ("bounce", -0.25), ("checkout", 0.15)],
    "checkout_conversion": [("checkout", 1.0), ("bounce", -0.15)],
    "ctr": [("click", 1.0), ("engagement", 0.3)],
    "bounce_rate": [("bounce", -1.0), ("convert", 0.2)],
    "cart_abandonment": [("checkout", 1.0), ("convert", 0.15)],
    "repeat_purchase_rate": [("repeat", 1.0), ("retain", 0.3)],
    "retention": [("retain", 1.0), ("repeat", 0.25)],
    "coupon_usage": [("coupon", 1.0), ("convert", 0.15)],
    "aov": [("aov", 1.0)],
    "arpu": [("convert", 0.6), ("aov", 0.5)],
    "revenue_per_visitor": [("convert", 0.6), ("aov", 0.5)],
    "session_length": [("session", 1.0), ("engagement", 0.4), ("convert", 0.1)],
    "delivery_time": [("delivery", -1.0), ("rating", 0.3), ("retain", 0.15)],
    "customer_satisfaction": [("rating", 1.0), ("retain", 0.2)],
    "restaurant_views": [("engagement", 1.0), ("convert", 0.1)],
    "searches": [("engagement", 1.0), ("convert", 0.1)],
    "menu_opens": [("engagement", 1.0), ("convert", 0.1)],
    "orders": [("convert", 0.8), ("repeat", 0.5)],
}

# Simulation baselines (drive the actual numbers; catalog baselines are display).
_BASE = {
    "reach": 0.165,     # P(reach checkout)
    "complete": 0.70,   # P(complete | reached)  → conversion ≈ 0.1155
    "click": 0.34,
    "bounce": 0.38,
    "repeat": 0.22,     # among ordered
    "retain": 0.41,
    "coupon": 0.28,     # among ordered
    "aov": 420.0,
    "session": 6.5,
    "delivery": 32.0,
    "rating": 4.2,
    "views": 8.5,
    "searches": 3.2,
    "menu": 5.1,
    "payment_success": 0.985,
}


def _clip_p(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 1e-4, 1 - 1e-4)


@dataclass
class Aggregate:
    n: int
    mean: float
    std: float
    successes: int = 0
    total: float = 0.0

    def as_dict(self) -> dict:
        return {
            "n": int(self.n),
            "mean": float(self.mean),
            "std": float(self.std),
            "successes": int(self.successes),
            "total": float(self.total),
        }


@dataclass
class SimulationOutput:
    n_users: int
    seed: int
    duration_ms: int
    variant_metrics: dict[str, dict[str, dict]]              # metric -> role -> agg dict
    segments: list[dict] = field(default_factory=list)
    daily_series: dict = field(default_factory=dict)
    funnel: dict = field(default_factory=dict)
    histograms: dict = field(default_factory=dict)


class SimulationEngine:
    def __init__(
        self,
        n_users: int,
        seed: int,
        control_split: float,
        duration_days: int,
        primary_metric_key: str,
        true_effect_pct: float,
    ) -> None:
        self.n = int(n_users)
        self.seed = int(seed)
        self.control_split = float(control_split)
        self.duration_days = max(int(duration_days), 1)
        self.primary_metric_key = primary_metric_key
        self.true_effect = float(true_effect_pct) / 100.0
        self.rng = np.random.default_rng(seed)

    # --------------------------------------------------------------------- #
    def run(self) -> SimulationOutput:
        start = time.perf_counter()
        n, rng = self.n, self.rng

        pop = seg.sample_population(n, rng)
        mult = seg.latent_multipliers(pop, n)

        # Variant assignment.
        is_control = rng.random(n) < self.control_split
        is_treatment = ~is_control

        # Heterogeneous treatment response (mean-normalised to 1 so the average
        # realised effect stays close to the intended true effect).
        response = np.ones(n)
        response *= np.where(pop["user_type"] == "New", 1.35, 0.82)
        response *= np.where(pop["device"] == "Desktop", 0.7,
                             np.where(pop["device"] == "iOS", 1.12, 1.05))
        response *= np.where(pop["tier"] == "Premium", 0.9, 1.05)
        response *= rng.lognormal(mean=0.0, sigma=0.12, size=n)
        if is_treatment.any():
            response[is_treatment] /= response[is_treatment].mean()

        # Apply the treatment effect to the relevant levers, treatment users only.
        for lever, weight in PRIMARY_LEVER_MAP.get(self.primary_metric_key, []):
            factor = 1.0 + self.true_effect * weight * response
            mult[lever] = np.where(is_treatment, mult[lever] * factor, mult[lever])

        frame = self._simulate_behaviour(pop, mult)
        frame["is_control"] = is_control
        frame["is_treatment"] = is_treatment
        frame["day"] = rng.integers(0, self.duration_days, size=n)
        for dim, values in pop.items():
            frame[dim] = values

        variant_metrics = self._aggregate_all_metrics(frame)
        segments = self._segment_analysis(frame, pop)
        daily = self._daily_series(frame)
        funnel = self._funnel(frame)
        histograms = self._histograms(frame)

        duration_ms = int((time.perf_counter() - start) * 1000)
        return SimulationOutput(
            n_users=n,
            seed=self.seed,
            duration_ms=duration_ms,
            variant_metrics=variant_metrics,
            segments=segments,
            daily_series=daily,
            funnel=funnel,
            histograms=histograms,
        )

    # --------------------------------------------------------------------- #
    def _simulate_behaviour(self, pop, mult) -> dict[str, np.ndarray]:
        """Sample the observed per-user events from latent propensities."""
        n, rng = self.n, self.rng

        p_reach = _clip_p(_BASE["reach"] * mult["convert"] * mult["engagement"] ** 0.15)
        p_complete = _clip_p(_BASE["complete"] * mult["checkout"])
        p_click = _clip_p(_BASE["click"] * mult["click"] * mult["engagement"] ** 0.2)
        p_bounce = _clip_p(_BASE["bounce"] * mult["bounce"])
        p_repeat = _clip_p(_BASE["repeat"] * mult["repeat"])
        p_retain = _clip_p(_BASE["retain"] * mult["retain"])
        p_coupon = _clip_p(_BASE["coupon"] * mult["coupon"])

        reached = rng.random(n) < p_reach
        completed = rng.random(n) < p_complete
        ordered = reached & completed
        cart_abandoned = reached & ~completed
        clicked = rng.random(n) < p_click
        bounced = rng.random(n) < p_bounce
        repeat_flag = ordered & (rng.random(n) < p_repeat)
        retained = rng.random(n) < p_retain
        coupon_flag = ordered & (rng.random(n) < p_coupon)
        payment_ok = ordered & (rng.random(n) < _BASE["payment_success"])
        order_count = ordered.astype(float) + repeat_flag.astype(float)

        # Continuous outcomes.
        aov_mean = np.maximum(_BASE["aov"] * mult["aov"], 1.0)
        aov_shape = 4.0  # coefficient of variation = 0.5
        aov_value = rng.gamma(shape=aov_shape, scale=aov_mean / aov_shape)
        aov_value = np.where(ordered, aov_value, 0.0)
        revenue = aov_value * order_count

        sess_mean = np.maximum(_BASE["session"] * mult["session"], 0.3)
        sess_shape = 2.8
        session = rng.gamma(shape=sess_shape, scale=sess_mean / sess_shape)

        delivery = rng.normal(_BASE["delivery"] * mult["delivery"], 6.0, n).clip(6, 120)
        rating = rng.normal(_BASE["rating"] * mult["rating"], 0.7, n).clip(1.0, 5.0)

        views = rng.poisson(np.maximum(_BASE["views"] * mult["engagement"], 0.1))
        views = np.where(bounced, (views * 0.3).astype(int), views)
        searches = rng.poisson(np.maximum(_BASE["searches"] * mult["engagement"], 0.05))
        menu = rng.poisson(np.maximum(_BASE["menu"] * mult["engagement"], 0.05))

        return {
            "reached": reached, "completed": completed, "ordered": ordered,
            "cart_abandoned": cart_abandoned, "clicked": clicked, "bounced": bounced,
            "repeat_flag": repeat_flag, "retained": retained, "coupon_flag": coupon_flag,
            "payment_ok": payment_ok, "order_count": order_count,
            "aov_value": aov_value, "revenue": revenue, "session": session,
            "delivery": delivery, "rating": rating,
            "views": views.astype(float), "searches": searches.astype(float),
            "menu": menu.astype(float),
        }

    # --------------------------------------------------------------------- #
    @staticmethod
    def _metric_arrays(frame: dict, key: str) -> tuple[str, np.ndarray, np.ndarray]:
        """Return (kind, values, eligibility_mask) for a metric key."""
        n = len(frame["ordered"])
        all_mask = np.ones(n, dtype=bool)
        table: dict[str, tuple[str, np.ndarray, np.ndarray]] = {
            "conversion_rate": ("prop", frame["ordered"].astype(float), all_mask),
            "checkout_conversion": ("prop", frame["completed"].astype(float), frame["reached"]),
            "ctr": ("prop", frame["clicked"].astype(float), all_mask),
            "bounce_rate": ("prop", frame["bounced"].astype(float), all_mask),
            "cart_abandonment": ("prop", frame["cart_abandoned"].astype(float), frame["reached"]),
            "repeat_purchase_rate": ("prop", frame["repeat_flag"].astype(float), frame["ordered"]),
            "retention": ("prop", frame["retained"].astype(float), all_mask),
            "coupon_usage": ("prop", frame["coupon_flag"].astype(float), frame["ordered"]),
            "aov": ("mean", frame["aov_value"], frame["ordered"]),
            "arpu": ("mean", frame["revenue"], all_mask),
            "revenue_per_visitor": ("mean", frame["revenue"], ~frame["bounced"]),
            "session_length": ("mean", frame["session"], all_mask),
            "delivery_time": ("mean", frame["delivery"], frame["ordered"]),
            "customer_satisfaction": ("mean", frame["rating"], frame["ordered"]),
            "restaurant_views": ("mean", frame["views"], all_mask),
            "searches": ("mean", frame["searches"], all_mask),
            "menu_opens": ("mean", frame["menu"], all_mask),
            "orders": ("mean", frame["order_count"], all_mask),
        }
        return table[key]

    @staticmethod
    def _aggregate(kind: str, values: np.ndarray, eligible: np.ndarray) -> Aggregate:
        vals = values[eligible]
        n = int(vals.size)
        if n == 0:
            return Aggregate(n=0, mean=0.0, std=0.0)
        if kind == "prop":
            succ = int(vals.sum())
            p = succ / n
            return Aggregate(n=n, mean=p, std=float(np.sqrt(p * (1 - p))), successes=succ)
        mean = float(vals.mean())
        std = float(vals.std(ddof=1)) if n > 1 else 0.0
        return Aggregate(n=n, mean=mean, std=std, total=float(vals.sum()))

    def _aggregate_all_metrics(self, frame) -> dict[str, dict[str, dict]]:
        out: dict[str, dict[str, dict]] = {}
        ctrl, treat = frame["is_control"], frame["is_treatment"]
        for spec in METRIC_SPECS:
            kind, values, mask = self._metric_arrays(frame, spec.key)
            c = self._aggregate(kind, values, mask & ctrl)
            t = self._aggregate(kind, values, mask & treat)
            out[spec.key] = {"control": c.as_dict(), "treatment": t.as_dict()}
        return out

    # --------------------------------------------------------------------- #
    def _segment_analysis(self, frame, pop) -> list[dict]:
        key = self.primary_metric_key
        kind, values, mask = self._metric_arrays(frame, key)
        ctrl, treat = frame["is_control"], frame["is_treatment"]
        results: list[dict] = []
        for dim, cfg in seg.SEGMENTS.items():
            dim_values = pop[dim]
            for segment in cfg["values"]:
                sub = dim_values == segment
                c = self._aggregate(kind, values, mask & ctrl & sub)
                t = self._aggregate(kind, values, mask & treat & sub)
                if c.n < 30 or t.n < 30:
                    continue
                lift = ((t.mean - c.mean) / c.mean * 100) if c.mean else 0.0
                if kind == "prop":
                    res = ts.two_proportion_z_test(c.successes, c.n, t.successes, t.n)
                else:
                    res = ts.two_sample_t_test(c.mean, c.std, c.n, t.mean, t.std, t.n)
                results.append({
                    "dimension": dim,
                    "dimension_label": cfg["label"],
                    "segment": segment,
                    "metric_key": key,
                    "control_n": c.n, "control_mean": c.mean,
                    "treatment_n": t.n, "treatment_mean": t.mean,
                    "lift_pct": lift,
                    "p_value": res.p_value,
                    "significant": res.p_value < 0.05,
                })
        return results

    # --------------------------------------------------------------------- #
    def _daily_series(self, frame) -> dict:
        key = self.primary_metric_key
        kind, values, mask = self._metric_arrays(frame, key)
        ctrl, treat = frame["is_control"], frame["is_treatment"]
        days = frame["day"]
        control_series, treatment_series = [], []
        for d in range(self.duration_days):
            day_mask = days == d
            c = self._aggregate(kind, values, mask & ctrl & day_mask)
            t = self._aggregate(kind, values, mask & treat & day_mask)
            control_series.append(round(c.mean, 6))
            treatment_series.append(round(t.mean, 6))
        return {
            "days": list(range(1, self.duration_days + 1)),
            "control": control_series,
            "treatment": treatment_series,
            "metric_key": key,
        }

    # --------------------------------------------------------------------- #
    def _funnel(self, frame) -> dict:
        def stages(sub: np.ndarray) -> list[dict]:
            return [
                {"stage": "Visitors", "count": int(sub.sum())},
                {"stage": "Restaurant Views", "count": int((sub & (frame["views"] > 0)).sum())},
                {"stage": "Menu Opens", "count": int((sub & (frame["menu"] > 0)).sum())},
                {"stage": "Checkout", "count": int((sub & frame["reached"]).sum())},
                {"stage": "Order Placed", "count": int((sub & frame["ordered"]).sum())},
                {"stage": "Payment", "count": int((sub & frame["payment_ok"]).sum())},
            ]
        return {
            "control": stages(frame["is_control"]),
            "treatment": stages(frame["is_treatment"]),
        }

    # --------------------------------------------------------------------- #
    def _histograms(self, frame) -> dict:
        """Distribution histograms for continuous metrics (AOV always; primary
        metric too when it is continuous)."""
        keys = {"aov"}
        if get_metric(self.primary_metric_key).metric_type == "mean":
            keys.add(self.primary_metric_key)
        out: dict[str, dict] = {}
        ctrl, treat = frame["is_control"], frame["is_treatment"]
        for key in keys:
            kind, values, mask = self._metric_arrays(frame, key)
            if kind != "mean":
                continue
            eligible = values[mask]
            if eligible.size == 0:
                continue
            lo, hi = np.percentile(eligible, [1, 99])
            bins = np.linspace(lo, hi, 31)
            c_counts, _ = np.histogram(values[mask & ctrl], bins=bins)
            t_counts, _ = np.histogram(values[mask & treat], bins=bins)
            centers = ((bins[:-1] + bins[1:]) / 2).round(2)
            out[key] = {
                "bins": centers.tolist(),
                "control": c_counts.tolist(),
                "treatment": t_counts.tolist(),
            }
        return out
