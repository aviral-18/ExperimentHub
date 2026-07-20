"""Effect-size measures and their qualitative labels.

Statistical significance answers *"is there an effect?"*; effect size answers
*"is it big enough to matter?"*. Reporting both is core to correct A/B analysis
— a huge sample can make a trivial 0.01% change "significant" yet meaningless.
"""
from __future__ import annotations

import math


def cohens_d(mean1: float, std1: float, n1: int, mean2: float, std2: float, n2: int) -> float:
    """Standardised mean difference using the pooled standard deviation.

    d = (mean2 - mean1) / s_pooled
    """
    if n1 < 2 or n2 < 2:
        return 0.0
    pooled_var = ((n1 - 1) * std1**2 + (n2 - 1) * std2**2) / (n1 + n2 - 2)
    s_pooled = math.sqrt(pooled_var) if pooled_var > 0 else 0.0
    if s_pooled == 0:
        return 0.0
    return (mean2 - mean1) / s_pooled


def cohens_h(p1: float, p2: float) -> float:
    """Effect size for the difference between two proportions.

    h = 2*arcsin(sqrt(p2)) - 2*arcsin(sqrt(p1))
    """
    p1 = min(max(p1, 0.0), 1.0)
    p2 = min(max(p2, 0.0), 1.0)
    return 2 * math.asin(math.sqrt(p2)) - 2 * math.asin(math.sqrt(p1))


def effect_label(value: float) -> str:
    """Cohen's conventional bands (applies to both d and h)."""
    a = abs(value)
    if a < 0.2:
        return "negligible"
    if a < 0.5:
        return "small"
    if a < 0.8:
        return "medium"
    return "large"
