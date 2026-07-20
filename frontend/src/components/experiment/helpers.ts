import { formatMetric } from "@/lib/format";
import type { MetricSpec, StatResult } from "@/types";

export function makeMetricHelpers(metrics: MetricSpec[] | undefined) {
  const byKey = new Map((metrics ?? []).map((m) => [m.key, m]));
  return {
    spec: (key: string) => byKey.get(key),
    label: (key: string) => byKey.get(key)?.label ?? key,
    unit: (key: string) => byKey.get(key)?.unit ?? "",
    fmt: (key: string, value: number) => formatMetric(byKey.get(key)?.unit ?? "", value),
  };
}

/** CI on the relative lift (approx via delta method: absolute CI / control). */
export function relativeCI(r: StatResult): { low: number; high: number } {
  if (!r.control_value) return { low: r.relative_lift_pct, high: r.relative_lift_pct };
  return {
    low: (r.ci_low / r.control_value) * 100,
    high: (r.ci_high / r.control_value) * 100,
  };
}

/** A plain-English interpretation of a single metric's result. */
export function explainStat(r: StatResult, spec: MetricSpec | undefined): string {
  const unit = spec?.unit ?? "";
  const label = spec?.label ?? r.metric_key;
  const c = formatMetric(unit, r.control_value);
  const t = formatMetric(unit, r.treatment_value);
  const conf = Math.round(r.ci_level * 100);
  const dir = r.treatment_value >= r.control_value ? "higher" : "lower";
  const pStr = r.p_value < 0.0001 ? "< 0.0001" : r.p_value.toFixed(4);

  const obs = `${label} was ${t} for treatment vs ${c} for control — ${dir} by ${Math.abs(
    r.relative_lift_pct
  ).toFixed(1)}% relative.`;

  const sig = r.significant
    ? `This is statistically significant (p = ${pStr}): if the variants were truly identical, a gap this large would be very unlikely by chance.`
    : `This is not statistically significant (p = ${pStr}): the gap is within the range we'd expect from random noise, so we can't conclude a real difference.`;

  const power =
    r.achieved_power < 0.8
      ? ` Statistical power was only ${(r.achieved_power * 100).toFixed(
          0
        )}% — treat a null result as inconclusive rather than negative.`
      : ` Statistical power was ${(r.achieved_power * 100).toFixed(0)}%.`;

  return `${obs} ${sig}${power}`;
}
