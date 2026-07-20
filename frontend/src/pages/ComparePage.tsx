import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { GitCompareArrows, Check, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { DecisionBadge } from "@/components/common/Badges";
import { Skeleton } from "@/components/ui/misc";
import { useExperiments, useMetrics } from "@/hooks/queries";
import { experimentApi } from "@/services/endpoints";
import { makeMetricHelpers } from "@/components/experiment/helpers";
import { formatCurrencyCompact, formatPValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalysisResponse } from "@/types";

export default function ComparePage() {
  const { data: experiments } = useExperiments({ sort: "recent" });
  const { data: metrics } = useMetrics();
  const h = makeMetricHelpers(metrics);
  const [selected, setSelected] = useState<number[]>([]);

  const withResults = useMemo(
    () => (experiments ?? []).filter((e) => e.has_results),
    [experiments]
  );

  const analyses = useQueries({
    queries: selected.map((id) => ({
      queryKey: ["analysis", id],
      queryFn: () => experimentApi.analysis(id),
    })),
  });

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    );
  }

  const loaded = analyses.every((a) => a.data) && selected.length > 0;

  return (
    <div>
      <PageHeader
        title="Compare Experiments"
        description="Put analysed experiments side by side to spot the strongest, safest bets. Select up to three."
      />

      {/* Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select experiments</CardTitle>
          <CardDescription>{selected.length}/3 selected · only analysed experiments can be compared</CardDescription>
        </CardHeader>
        <CardContent>
          {withResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No analysed experiments yet. Run an experiment first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {withResults.map((e) => {
                const on = selected.includes(e.id);
                const disabled = !on && selected.length >= 3;
                return (
                  <button
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                      disabled && "cursor-not-allowed opacity-40"
                    )}
                  >
                    {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                    {e.name}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison */}
      {selected.length === 0 ? (
        <EmptyState
          icon={<GitCompareArrows className="size-6" />}
          title="Nothing to compare yet"
          description="Select two or three analysed experiments above to see them side by side."
        />
      ) : !loaded ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {selected.map((id) => <Skeleton key={id} className="h-96 rounded-xl" />)}
        </div>
      ) : (
        <ComparisonGrid analyses={analyses.map((a) => a.data!).filter(Boolean)} h={h} />
      )}
    </div>
  );
}

function ComparisonGrid({
  analyses,
  h,
}: {
  analyses: AnalysisResponse[];
  h: ReturnType<typeof makeMetricHelpers>;
}) {
  const rows = analyses.map((a) => {
    const p = a.statistical_results.find((r) => r.is_primary)!;
    return { a, p };
  });
  const bestLift = Math.max(...rows.map((r) => r.p.relative_lift_pct));
  const bestRev = Math.max(...rows.map((r) => r.a.report.sections.projected_annual_revenue ?? 0));

  return (
    <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
      {rows.map(({ a, p }) => {
        const isBestLift = p.relative_lift_pct === bestLift;
        const rev = a.report.sections.projected_annual_revenue ?? 0;
        return (
          <Card key={a.experiment_id} className={cn(isBestLift && "border-primary/40 shadow-glow")}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <DecisionBadge decision={a.report.decision} />
                {isBestLift && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Top lift</span>}
              </div>
              <CardTitle className="mt-2 text-base leading-tight">{h.label(a.primary_metric_key)}</CardTitle>
              <CardDescription>Primary metric</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={cn("text-3xl font-bold tnum", p.relative_lift_pct >= 0 ? "text-success" : "text-danger")}>
                {p.relative_lift_pct >= 0 ? "+" : ""}
                {p.relative_lift_pct.toFixed(2)}%
              </div>
              <Row label="Control" value={h.fmt(p.metric_key, p.control_value)} />
              <Row label="Treatment" value={h.fmt(p.metric_key, p.treatment_value)} />
              <Row label="p-value" value={formatPValue(p.p_value)} />
              <Row label="Power" value={`${(p.achieved_power * 100).toFixed(0)}%`} />
              <Row label="Significant" value={p.significant ? <Check className="size-4 text-success" /> : <X className="size-4 text-muted-foreground" />} />
              <Row label="Confidence" value={`${a.report.confidence_score.toFixed(0)}/100`} />
              <Row
                label="Proj. revenue"
                value={<span className={cn(rev === bestRev && rev > 0 && "text-success font-semibold")}>{rev >= 0 ? "" : "-"}{formatCurrencyCompact(Math.abs(rev))}</span>}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm first:border-0 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tnum">{value}</span>
    </div>
  );
}
