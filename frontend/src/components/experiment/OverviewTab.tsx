import { Target, Lightbulb, CheckCircle2, TrendingUp, Filter, Beaker } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stat } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ResultHero } from "./ResultHero";
import { TrendChart } from "@/components/charts/TrendChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { makeMetricHelpers } from "./helpers";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalysisResponse, ExperimentDetail, MetricSpec } from "@/types";

export function OverviewTab({
  experiment,
  analysis,
  metrics,
}: {
  experiment: ExperimentDetail;
  analysis: AnalysisResponse | null;
  metrics: MetricSpec[];
}) {
  const h = makeMetricHelpers(metrics);
  const control = experiment.variants.find((v) => v.role === "control");
  const treatment = experiment.variants.find((v) => v.role === "treatment");
  const controlName = control?.name ?? "Control";
  const treatmentName = treatment?.name ?? "Treatment";

  const primary = analysis?.statistical_results.find((r) => r.is_primary);
  const secondary = analysis?.statistical_results.filter((r) => !r.is_primary).slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      {analysis && primary && (
        <ResultHero
          primary={primary}
          report={analysis.report}
          spec={h.spec(primary.metric_key)}
          controlName={controlName}
          treatmentName={treatmentName}
          fmt={h.fmt}
        />
      )}

      {/* Charts */}
      {analysis && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Metric Trend</CardTitle>
              <CardDescription>{h.label(analysis.primary_metric_key)} over the experiment window</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.run.daily_series?.days?.length ? (
                <TrendChart
                  days={analysis.run.daily_series.days}
                  control={analysis.run.daily_series.control ?? []}
                  treatment={analysis.run.daily_series.treatment ?? []}
                  unit={h.unit(analysis.primary_metric_key)}
                  controlName={controlName}
                  treatmentName={treatmentName}
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No trend data.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Filter className="size-4 text-primary" /> Conversion Funnel</CardTitle>
              <CardDescription>Where users drop off, by variant</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.run.funnel?.control?.length ? (
                <FunnelChart
                  control={analysis.run.funnel.control}
                  treatment={analysis.run.funnel.treatment ?? []}
                  controlName={controlName}
                  treatmentName={treatmentName}
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No funnel data.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secondary metrics grid */}
      {secondary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Secondary &amp; Guardrail Metrics</CardTitle>
            <CardDescription>Supporting signals and metrics that must not regress.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {secondary.map((r) => {
                const spec = h.spec(r.metric_key);
                const goodDir = (spec?.goal ?? "increase") === "increase" ? r.relative_lift_pct >= 0 : r.relative_lift_pct < 0;
                return (
                  <div key={r.metric_key} className="rounded-lg border border-border bg-surface/40 p-3">
                    <div className="truncate text-xs text-muted-foreground" title={h.label(r.metric_key)}>
                      {h.label(r.metric_key)}
                    </div>
                    <div className="mt-1 text-sm font-semibold tnum">{h.fmt(r.metric_key, r.treatment_value)}</div>
                    <div className={cn("mt-0.5 text-xs font-medium tnum", goodDir ? "text-success" : r.significant ? "text-danger" : "text-muted-foreground")}>
                      {r.relative_lift_pct >= 0 ? "+" : ""}
                      {r.relative_lift_pct.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Definition + design */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Brief icon={Lightbulb} label="Hypothesis" text={experiment.hypothesis || "—"} />
              <Brief icon={Target} label="Business objective" text={experiment.business_objective || "—"} />
              <Brief icon={CheckCircle2} label="Success criteria" text={experiment.success_criteria || "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Beaker className="size-4 text-primary" /> Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {experiment.variants.map((v) => (
                <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 p-3">
                  <span
                    className="h-8 w-1 rounded-full"
                    style={{ background: v.role === "control" ? "#a89482" : "#7c6cff" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{v.name}</span>
                      <Badge variant={v.role === "control" ? "secondary" : "default"}>{v.role}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{v.description}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Design Parameters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Stat label="Primary metric" value={<span className="text-sm">{h.label(experiment.primary_metric_key)}</span>} />
            <Stat label="Expected lift" value={`${experiment.expected_lift_pct}%`} />
            <Stat label="Confidence" value={`${Math.round(experiment.confidence_level * 100)}%`} />
            <Stat label="Power target" value={`${Math.round(experiment.power * 100)}%`} />
            <Stat label="Total users" value={formatCompact(experiment.total_users)} />
            <Stat label="Duration" value={`${experiment.duration_days} days`} />
            <Stat label="Control split" value={`${Math.round(experiment.control_split * 100)}%`} />
            <Stat label="Traffic" value={`${Math.round(experiment.traffic_allocation * 100)}%`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Brief({ icon: Icon, label, text }: { icon: React.ElementType; label: string; text: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}
