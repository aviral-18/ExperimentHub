"""Segment definitions and the latent behaviour model.

Real users are heterogeneous: a returning premium user on iOS behaves very
differently from a first-time visitor on desktop. We encode that with
per-segment multipliers applied to a set of latent per-user propensities. The
observed events (clicks, orders, revenue…) are then *sampled* from these
propensities, which is what injects realistic randomness.
"""
from __future__ import annotations

import numpy as np

# --------------------------------------------------------------------------- #
# Segment dimensions and their population mix.
# --------------------------------------------------------------------------- #
SEGMENTS: dict[str, dict] = {
    "device": {
        "label": "Device",
        "values": ["Android", "iOS", "Desktop"],
        "weights": [0.55, 0.30, 0.15],
    },
    "user_type": {
        "label": "User Type",
        "values": ["New", "Returning"],
        "weights": [0.45, 0.55],
    },
    "tier": {
        "label": "Membership",
        "values": ["Premium", "Standard"],
        "weights": [0.22, 0.78],
    },
    "city": {
        "label": "City",
        "values": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad"],
        "weights": [0.28, 0.24, 0.22, 0.13, 0.13],
    },
    "age_group": {
        "label": "Age Group",
        "values": ["18–24", "25–34", "35–44", "45+"],
        "weights": [0.30, 0.38, 0.20, 0.12],
    },
}

# --------------------------------------------------------------------------- #
# Latent propensity multipliers per segment value.
# Each entry scales a subset of the latent levers relative to baseline.
# Levers: convert, click, checkout, aov, bounce, repeat, retain, coupon,
#         session, delivery, rating, engagement (views/searches/menu).
# --------------------------------------------------------------------------- #
_MULT: dict[str, dict[str, dict[str, float]]] = {
    "user_type": {
        "New": {"convert": 0.78, "repeat": 0.35, "retain": 0.65, "aov": 0.92,
                "bounce": 1.35, "coupon": 1.5, "engagement": 1.1},
        "Returning": {"convert": 1.35, "repeat": 1.8, "retain": 1.5, "aov": 1.1,
                      "bounce": 0.72, "coupon": 0.8, "engagement": 0.95},
    },
    "tier": {
        "Premium": {"convert": 1.22, "aov": 1.42, "retain": 1.3, "delivery": 0.9,
                    "rating": 1.05, "repeat": 1.4},
        "Standard": {"aov": 0.95},
    },
    "device": {
        "Android": {"aov": 0.96},
        "iOS": {"convert": 1.06, "aov": 1.16},
        "Desktop": {"convert": 0.9, "aov": 1.12, "session": 1.35, "bounce": 1.1},
    },
    "city": {
        "Mumbai": {"aov": 1.12, "delivery": 1.05},
        "Delhi": {"aov": 1.05, "delivery": 1.08},
        "Bengaluru": {"aov": 1.08, "delivery": 0.95, "convert": 1.05},
        "Pune": {"aov": 0.98},
        "Hyderabad": {"aov": 0.96, "delivery": 0.92},
    },
    "age_group": {
        "18–24": {"coupon": 1.3, "aov": 0.9, "session": 1.15},
        "25–34": {"convert": 1.08, "aov": 1.05},
        "35–44": {"aov": 1.12, "convert": 1.02},
        "45+": {"aov": 1.15, "session": 0.85, "convert": 0.95},
    },
}

# Levers whose "higher is worse" (multipliers > 1 mean more of a bad thing).
_LEVERS = [
    "convert", "click", "checkout", "aov", "bounce", "repeat", "retain",
    "coupon", "session", "delivery", "rating", "engagement",
]


def sample_population(n: int, rng: np.random.Generator) -> dict[str, np.ndarray]:
    """Draw segment labels for ``n`` users."""
    out: dict[str, np.ndarray] = {}
    for dim, cfg in SEGMENTS.items():
        out[dim] = rng.choice(cfg["values"], size=n, p=cfg["weights"])
    return out


def latent_multipliers(pop: dict[str, np.ndarray], n: int) -> dict[str, np.ndarray]:
    """Combine per-segment multipliers into one array per lever."""
    mult = {lever: np.ones(n) for lever in _LEVERS}
    for dim, values in pop.items():
        table = _MULT.get(dim, {})
        for seg_value, adjustments in table.items():
            mask = values == seg_value
            for lever, factor in adjustments.items():
                mult[lever][mask] *= factor
    return mult
