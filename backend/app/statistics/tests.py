"""Hypothesis tests and confidence intervals.

Two workhorses of online experimentation:

* ``two_proportion_z_test`` — for rate metrics (conversion, CTR, retention).
* ``two_sample_t_test``     — for continuous metrics (AOV, revenue, session len).

Both are two-sided and return the test statistic, p-value and a confidence
interval **on the absolute difference (treatment − control)**.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from scipy import stats


@dataclass
class TestResult:
    test_name: str
    statistic: float          # z or t
    p_value: float
    diff: float               # treatment - control (absolute)
    ci_low: float
    ci_high: float
    std_error: float
    df: float | None = None   # degrees of freedom (t-test only)


def two_proportion_z_test(
    x1: int, n1: int, x2: int, n2: int, confidence: float = 0.95
) -> TestResult:
    """Compare two conversion rates.

    Parameters use group 1 = control, group 2 = treatment. ``x`` is the number
    of successes, ``n`` the sample size.

    * The **test statistic** uses the *pooled* standard error (valid under the
      null hypothesis that both proportions are equal).
    * The **confidence interval** uses the *unpooled* standard error, which is
      the correct estimator when the two proportions may genuinely differ.
    """
    n1 = max(n1, 1)
    n2 = max(n2, 1)
    p1 = x1 / n1
    p2 = x2 / n2
    diff = p2 - p1

    # Pooled SE for the z-statistic (null: p1 == p2).
    p_pool = (x1 + x2) / (n1 + n2)
    se_pool = math.sqrt(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2))
    z = diff / se_pool if se_pool > 0 else 0.0
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))

    # Unpooled SE for the confidence interval on the difference.
    se_unpool = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    z_crit = stats.norm.ppf(1 - (1 - confidence) / 2)
    margin = z_crit * se_unpool

    return TestResult(
        test_name="Two-proportion z-test",
        statistic=float(z),
        p_value=float(p_value),
        diff=float(diff),
        ci_low=float(diff - margin),
        ci_high=float(diff + margin),
        std_error=float(se_unpool),
    )


def two_sample_t_test(
    mean1: float, std1: float, n1: int,
    mean2: float, std2: float, n2: int,
    confidence: float = 0.95, welch: bool = True,
) -> TestResult:
    """Compare two means (Welch's t-test by default).

    Welch's test does **not** assume equal variances, which is the safer and
    now-recommended default for real-world experiment data where the treatment
    can change the spread as well as the centre.
    """
    n1 = max(n1, 2)
    n2 = max(n2, 2)
    v1, v2 = std1**2, std2**2
    diff = mean2 - mean1

    if welch:
        se = math.sqrt(v1 / n1 + v2 / n2)
        # Welch–Satterthwaite degrees of freedom.
        denom = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1)
        df = (v1 / n1 + v2 / n2) ** 2 / denom if denom > 0 else (n1 + n2 - 2)
    else:
        pooled_var = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
        se = math.sqrt(pooled_var * (1 / n1 + 1 / n2))
        df = n1 + n2 - 2

    t = diff / se if se > 0 else 0.0
    p_value = 2 * (1 - stats.t.cdf(abs(t), df))
    t_crit = stats.t.ppf(1 - (1 - confidence) / 2, df)
    margin = t_crit * se

    return TestResult(
        test_name="Welch's two-sample t-test" if welch else "Two-sample t-test",
        statistic=float(t),
        p_value=float(p_value),
        diff=float(diff),
        ci_low=float(diff - margin),
        ci_high=float(diff + margin),
        std_error=float(se),
        df=float(df),
    )
