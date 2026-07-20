import { useState } from "react";
import { ChevronRight, Sigma, Ruler, Zap, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIntervalChart, type CIRow } from "@/components/charts/ConfidenceIntervalChart";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { Stat } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { formatMetric, formatNumber, formatPValue } from "@/lib/format";
import { makeMetricHelpers, relativeCI, explainStat } from "./helpers";
import type { AnalysisResponse, MetricSpec } from "@/types";

export function StatisticsTab({
  analysis,
  metrics,
  controlName,
  treatmentName,
}: {
  analysis: AnalysisResponse;
  metrics: MetricSpec[];
  controlName: string;
  treatmentName: string;
}) {
  const h = makeMetricHelpers(metrics);
  const primary = analysis.statistical_results.find((r) => r.is_primary)!;
  const primarySpec = h.spec(primary.metric_key);

  const ciRows: CIRow[] = analysis.statistical_results.map((r) => {
    const rci = relativeCI(r);
    return {
      label: h.label(r.metric_key),
      low: rci.low,
      high: rci.high,
      point: r.relative_lift_pct,
      significant: r.significant,
      improvement:
        (h.spec(r.metric_key)?.goal ?? "increase") === "increase"
          ? r.relative_lift_pct >= 0
          : r.relative_lift_pct < 0,
      isPrimary: r.is_primary,
    };
  });

  const dist = buildDistribution(analysis, primarySpec);

  return (
    <div className="space-y-6">
      {/* Primary explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sigma className="size-4 text-primary" /> Primary Metric Interpretation
          </CardTitle>
          <CardDescription>{primary.test_name}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">
            {explainStat(primary, primarySpec)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Test statistic" value={primary.statistic.toFixed(3)} />
            <Stat label="p-value" value={formatPValue(primary.p_value)} />
            <Stat
              label="Effect size"
              value={`${primary.effect_size >= 0 ? "+" : ""}${primary.effect_size.toFixed(3)}`}
              hint={primary.effect_label}
            />
            <Stat label="Achieved power" value={`${(primary.achieved_power * 100).toFixed(0)}%`} />
          </div>
        </CardContent>
      </Card>

      {/* CI forest + distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Ruler className="size-4 text-primary" /> Confidence Intervals</CardTitle>
            <CardDescription>Relative lift ± {Math.round(primary.ci_level * 100)}% CI. Crossing 0 = not significant.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfidenceIntervalChart rows={ciRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="size-4 text-primary" /> Sampling Distributions</CardTitle>
            <CardDescription>
              {primarySpec?.metric_type === "proportion"
                ? "Sampling distribution of the proportion per variant — separation implies significance."
                : `Distribution of ${primarySpec?.label} per variant.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dist ? (
              <DistributionChart
                data={dist.data}
                unit={dist.unit}
                controlMean={dist.controlMean}
                treatmentMean={dist.treatmentMean}
                controlName={controlName}
                treatmentName={treatmentName}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No distribution data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Power & design diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle>Power &amp; Design Diagnostics</CardTitle>
          <CardDescription>Was the test sensitive enough to detect the effect it was designed for?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Achieved power" value={`${(primary.achieved_power * 100).toFixed(0)}%`} hint="chance of detecting a true effect" />
          <Stat
            label="Min. detectable effect"
            value={formatMetric(h.unit(primary.metric_key), primary.mde_abs)}
            hint="smallest effect at target power"
          />
          <Stat label="Required n / arm" value={formatNumber(primary.required_sample_per_arm)} hint="to detect observed lift" />
          <Stat label="Actual n / arm" value={`~${formatNumber(Math.round(analysis.run.n_users / 2))}`} />
        </CardContent>
      </Card>

      {/* Full results table */}
      <Card>
        <CardHeader>
          <CardTitle>All Metrics</CardTitle>
          <CardDescription>Every tracked metric with its correct statistical test. Click a row to interpret it.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <StatTable analysis={analysis} metrics={metrics} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatTable({ analysis, metrics }: { analysis: AnalysisResponse; metrics: MetricSpec[] }) {
  const h = makeMetricHelpers(metrics);
  const [expanded, setExpanded] = useState<string | null>(analysis.primary_metric_key);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">Metric</th>
            <th className="px-3 py-2.5 text-right font-medium">Control</th>
            <th className="px-3 py-2.5 text-right font-medium">Treatment</th>
            <th className="px-3 py-2.5 text-right font-medium">Lift</th>
            <th className="px-3 py-2.5 text-right font-medium">p-value</th>
            <th className="px-3 py-2.5 text-right font-medium">Power</th>
            <th className="px-5 py-2.5 text-right font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {analysis.statistical_results.map((r) => {
            const spec = h.spec(r.metric_key);
            const isOpen = expanded === r.metric_key;
            const goodDir = (spec?.goal ?? "increase") === "increase" ? r.relative_lift_pct >= 0 : r.relative_lift_pct < 0;
            return (
              <>
                <tr
                  key={r.metric_key}
                  onClick={() => setExpanded(isOpen ? null : r.metric_key)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 transition-colors hover:bg-elevated/50",
                    r.is_primary && "bg-primary/[0.04]"
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                      <span className="font-medium">{h.label(r.metric_key)}</span>
                      {r.is_primary && <Badge variant="default" className="px-1.5 py-0 text-[10px]">Primary</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-muted-foreground">{h.fmt(r.metric_key, r.control_value)}</td>
                  <td className="px-3 py-3 text-right tnum font-medium">{h.fmt(r.metric_key, r.treatment_value)}</td>
                  <td className={cn("px-3 py-3 text-right font-semibold tnum", goodDir ? "text-success" : "text-danger")}>
                    {r.relative_lift_pct >= 0 ? "+" : ""}
                    {r.relative_lift_pct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-3 text-right tnum text-muted-foreground">{formatPValue(r.p_value)}</td>
                  <td className="px-3 py-3 text-right tnum text-muted-foreground">{(r.achieved_power * 100).toFixed(0)}%</td>
                  <td className="px-5 py-3 text-right">
                    {r.significant ? (
                      <Badge variant={goodDir ? "success" : "danger"}>{goodDir ? "Win" : "Regression"}</Badge>
                    ) : (
                      <Badge variant="secondary">Flat</Badge>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-border/60 bg-surface/40">
                    <td colSpan={7} className="px-5 py-3">
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span className="leading-relaxed">{explainStat(r, spec)}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Build sampling-distribution or histogram data for the primary metric. */
function buildDistribution(analysis: AnalysisResponse, spec?: MetricSpec) {
  const key = analysis.primary_metric_key;
  const control = analysis.variant_metrics.find((v) => v.variant_role === "control" && v.metric_key === key);
  const treatment = analysis.variant_metrics.find((v) => v.variant_role === "treatment" && v.metric_key === key);
  if (!control || !treatment) return null;
  const unit = spec?.unit ?? "";

  // Continuous metric with a stored histogram.
  if (control.histogram?.bins?.length && control.histogram?.counts?.length) {
    const bins = control.histogram.bins;
    const cCounts = control.histogram.counts;
    const tCounts = treatment.histogram?.counts ?? [];
    return {
      unit,
      controlMean: control.mean,
      treatmentMean: treatment.mean,
      data: bins.map((x, i) => ({ x, control: cCounts[i] ?? 0, treatment: tCounts[i] ?? 0 })),
    };
  }

  // Otherwise model the sampling distribution of the mean/proportion as Gaussian.
  const seC = control.std / Math.sqrt(Math.max(control.n, 1));
  const seT = treatment.std / Math.sqrt(Math.max(treatment.n, 1));
  const se = Math.max(seC, seT, 1e-9);
  const lo = Math.min(control.mean, treatment.mean) - 4 * se;
  const hi = Math.max(control.mean, treatment.mean) + 4 * se;
  const N = 70;
  const pdf = (x: number, mu: number, s: number) =>
    Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  const data = Array.from({ length: N }, (_, i) => {
    const x = lo + ((hi - lo) * i) / (N - 1);
    return { x, control: pdf(x, control.mean, seC || se), treatment: pdf(x, treatment.mean, seT || se) };
  });
  return { unit, controlMean: control.mean, treatmentMean: treatment.mean, data };
}
