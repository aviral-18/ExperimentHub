"""Central metric catalog.

A single source of truth for every metric the platform understands: how it is
displayed, whether it is a proportion or a mean, whether higher or lower is
better, and a realistic baseline value for a food-delivery marketplace. The
simulation engine, statistics engine, schemas and frontend all key off this.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MetricSpec:
    key: str
    label: str
    unit: str                 # "%", "₹", "min", "★", "", "count"
    metric_type: str          # "proportion" | "mean"
    goal: str                 # "increase" | "decrease"
    baseline: float           # baseline value (proportions as 0..1, means in units)
    description: str
    category: str = "Engagement"


# Order matters — first proportion + first suitable are surfaced as defaults.
METRIC_SPECS: list[MetricSpec] = [
    MetricSpec("conversion_rate", "Conversion Rate", "%", "proportion", "increase", 0.115,
               "Share of visitors who place at least one order.", "Growth"),
    MetricSpec("checkout_conversion", "Checkout Conversion", "%", "proportion", "increase", 0.70,
               "Share of users reaching checkout who complete the order.", "Growth"),
    MetricSpec("ctr", "Click-Through Rate", "%", "proportion", "increase", 0.34,
               "Share of users who click a restaurant or item card.", "Engagement"),
    MetricSpec("bounce_rate", "Bounce Rate", "%", "proportion", "decrease", 0.38,
               "Share of sessions that leave without meaningful interaction.", "Engagement"),
    MetricSpec("cart_abandonment", "Cart Abandonment", "%", "proportion", "decrease", 0.30,
               "Share of users who reach checkout but do not order.", "Growth"),
    MetricSpec("repeat_purchase_rate", "Repeat Purchase Rate", "%", "proportion", "increase", 0.22,
               "Share of ordering users who order more than once.", "Retention"),
    MetricSpec("retention", "D7 Retention", "%", "proportion", "increase", 0.41,
               "Share of users active again within 7 days.", "Retention"),
    MetricSpec("coupon_usage", "Coupon Usage", "%", "proportion", "increase", 0.28,
               "Share of ordering users who redeem a coupon.", "Growth"),
    MetricSpec("aov", "Average Order Value", "₹", "mean", "increase", 420.0,
               "Average basket value among orders placed.", "Revenue"),
    MetricSpec("arpu", "ARPU", "₹", "mean", "increase", 48.0,
               "Average revenue per assigned user (revenue ÷ all users).", "Revenue"),
    MetricSpec("revenue_per_visitor", "Revenue / Visitor", "₹", "mean", "increase", 52.0,
               "Average revenue per visiting user.", "Revenue"),
    MetricSpec("session_length", "Session Length", "min", "mean", "increase", 6.5,
               "Average time spent in the app per session.", "Engagement"),
    MetricSpec("delivery_time", "Delivery Time", "min", "mean", "decrease", 32.0,
               "Average order delivery time.", "Operations"),
    MetricSpec("customer_satisfaction", "Customer Satisfaction", "★", "mean", "increase", 4.2,
               "Average post-order rating (1–5 stars).", "Retention"),
    MetricSpec("restaurant_views", "Restaurant Views", "count", "mean", "increase", 8.5,
               "Average restaurant listings viewed per session.", "Engagement"),
    MetricSpec("searches", "Searches", "count", "mean", "increase", 3.2,
               "Average searches performed per session.", "Engagement"),
    MetricSpec("menu_opens", "Menu Opens", "count", "mean", "increase", 5.1,
               "Average menus opened per session.", "Engagement"),
    MetricSpec("orders", "Orders / User", "count", "mean", "increase", 0.14,
               "Average number of orders per assigned user.", "Growth"),
]

METRIC_BY_KEY: dict[str, MetricSpec] = {m.key: m for m in METRIC_SPECS}


def get_metric(key: str) -> MetricSpec:
    return METRIC_BY_KEY[key]


def format_metric_value(key: str, value: float) -> str:
    """Human formatting used by narratives and exports."""
    spec = METRIC_BY_KEY.get(key)
    if spec is None:
        return f"{value:,.2f}"
    if spec.unit == "%":
        return f"{value * 100:.2f}%"
    if spec.unit == "₹":
        return f"₹{value:,.2f}"
    if spec.unit == "min":
        return f"{value:.1f} min"
    if spec.unit == "★":
        return f"{value:.2f}★"
    if spec.unit == "count":
        return f"{value:.2f}"
    return f"{value:,.2f}"
