"""Power analysis, minimum detectable effect (MDE) and sample-size estimation.

These answer the questions a PM must resolve *before* trusting a result:

* **Sample size** — "how many users per arm do I need to detect the lift I care
  about?" (asked at design time).
* **Achieved power** — "given the traffic I actually got and the effect I
  observed, how likely was I to detect a true effect?" (asked at analysis time —
  a low value warns that a null result may just be under-powered).
* **MDE** — "with this traffic, what is the smallest effect I could reliably
  detect?"
"""
from __future__ import annotations

import math

from scipy import stats
from statsmodels.stats.power import NormalIndPower, TTestIndPower
from statsmodels.stats.proportion import proportion_effectsize

_prop_power = NormalIndPower()
_mean_power = TTestIndPower()


def _normal_power(effect_size: float, n_per_arm: int, alpha: float) -> float:
    """Stable normal-approximation of two-sided power for a standardised effect.

    statsmodels' noncentral-t/normal solvers can return NaN when the true power
    is numerically ≈1.0 (large n, moderate effect). This closed form is used as
    a fallback so power is always a finite, correct number.
    """
    from math import sqrt
    ncp = abs(effect_size) * sqrt(n_per_arm / 2.0)  # noncentrality
    z_crit = stats.norm.ppf(1 - alpha / 2)
    power = stats.norm.cdf(ncp - z_crit) + stats.norm.cdf(-ncp - z_crit)
    return float(min(max(power, 0.0), 1.0))


def _finite(value: float, effect_size: float, n_per_arm: int, alpha: float) -> float:
    import math
    if value is None or math.isnan(value) or math.isinf(value):
        return _normal_power(effect_size, n_per_arm, alpha)
    return float(value)


# --------------------------------------------------------------------------- #
# Proportions (conversion-style metrics)
# --------------------------------------------------------------------------- #
def proportion_sample_size(
    p_control: float, mde_relative: float, alpha: float = 0.05, power: float = 0.8
) -> int:
    """Users required **per arm** to detect a relative lift of ``mde_relative``.

    ``mde_relative`` is expressed as a fraction (0.05 = a 5% relative lift).
    """
    p_control = min(max(p_control, 1e-6), 1 - 1e-6)
    p_treatment = min(max(p_control * (1 + mde_relative), 1e-6), 1 - 1e-6)
    effect = proportion_effectsize(p_treatment, p_control)  # Cohen's h
    if effect == 0:
        return 0
    n = _prop_power.solve_power(
        effect_size=abs(effect), alpha=alpha, power=power, ratio=1.0, alternative="two-sided"
    )
    return int(math.ceil(n))


def proportion_power(
    p_control: float, p_treatment: float, n_per_arm: int, alpha: float = 0.05
) -> float:
    """Achieved power for an observed pair of proportions at sample size n."""
    if n_per_arm < 2:
        return 0.0
    effect = proportion_effectsize(p_treatment, p_control)
    if effect == 0:
        return 0.0
    value = _prop_power.power(
        effect_size=abs(effect), nobs1=n_per_arm, alpha=alpha, ratio=1.0,
        alternative="two-sided",
    )
    return _finite(value, effect, n_per_arm, alpha)


# --------------------------------------------------------------------------- #
# Means (continuous metrics)
# --------------------------------------------------------------------------- #
def mean_sample_size(
    effect_size_d: float, alpha: float = 0.05, power: float = 0.8
) -> int:
    """Users per arm to detect a standardised effect (Cohen's d)."""
    if effect_size_d == 0:
        return 0
    n = _mean_power.solve_power(
        effect_size=abs(effect_size_d), alpha=alpha, power=power, ratio=1.0,
        alternative="two-sided",
    )
    return int(math.ceil(n))


def mean_power(effect_size_d: float, n_per_arm: int, alpha: float = 0.05) -> float:
    if n_per_arm < 2 or effect_size_d == 0:
        return 0.0
    value = _mean_power.power(
        effect_size=abs(effect_size_d), nobs1=n_per_arm, alpha=alpha, ratio=1.0,
        alternative="two-sided",
    )
    return _finite(value, effect_size_d, n_per_arm, alpha)


# --------------------------------------------------------------------------- #
# Minimum detectable effect
# --------------------------------------------------------------------------- #
def proportion_mde_absolute(
    p_control: float, n_per_arm: int, alpha: float = 0.05, power: float = 0.8
) -> float:
    """Smallest **absolute** lift in proportion detectable at this sample size.

    Uses the standard closed-form approximation:
        MDE = (z_alpha/2 + z_power) * sqrt(2 * p(1-p) / n)
    """
    if n_per_arm < 2:
        return 0.0
    z_a = stats.norm.ppf(1 - alpha / 2)
    z_b = stats.norm.ppf(power)
    p = min(max(p_control, 1e-6), 1 - 1e-6)
    return float((z_a + z_b) * math.sqrt(2 * p * (1 - p) / n_per_arm))


def mean_mde_absolute(
    std: float, n_per_arm: int, alpha: float = 0.05, power: float = 0.8
) -> float:
    """Smallest **absolute** difference in means detectable at this sample size."""
    if n_per_arm < 2:
        return 0.0
    z_a = stats.norm.ppf(1 - alpha / 2)
    z_b = stats.norm.ppf(power)
    return float((z_a + z_b) * math.sqrt(2 * std**2 / n_per_arm))
