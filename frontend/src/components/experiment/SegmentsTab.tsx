import { Layers, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SegmentChart } from "@/components/charts/SegmentChart";
import { useSegments } from "@/hooks/queries";
import { makeMetricHelpers } from "./helpers";
import type { AnalysisResponse, MetricSpec } from "@/types";

export function SegmentsTab({
  analysis,
  metrics,
}: {
  analysis: AnalysisResponse;
  metrics: MetricSpec[];
}) {
  const { data: segmentMeta } = useSegments();
  const h = makeMetricHelpers(metrics);
  const primaryLabel = h.label(analysis.primary_metric_key);

  const byDimension = groupBy(analysis.segments, (s) => s.dimension);
  const dims = Object.keys(byDimension);

  // Find the strongest & weakest responding segments overall for the callout.
  const sorted = [...analysis.segments].sort((a, b) => b.lift_pct - a.lift_pct);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const sigCount = analysis.segments.filter((s) => s.significant).length;

  if (!analysis.segments.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No segment breakdown available for this run.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Heterogeneity callout */}
      {top && bottom && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent">
          <CardContent className="flex gap-3 py-5">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm leading-relaxed">
              <span className="font-semibold">Heterogeneous treatment effect.</span> {primaryLabel} moved{" "}
              <span className="font-semibold text-success">{top.segment} {top.lift_pct >= 0 ? "+" : ""}{top.lift_pct.toFixed(1)}%</span>{" "}
              but only{" "}
              <span className={`font-semibold ${bottom.lift_pct >= 0 ? "text-success" : "text-danger"}`}>
                {bottom.segment} {bottom.lift_pct >= 0 ? "+" : ""}{bottom.lift_pct.toFixed(1)}%
              </span>
              . {sigCount} of {analysis.segments.length} segments reached significance. Aggregate lift can hide this —
              always segment before generalising (a classic Simpson's-paradox guard).
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {dims.map((dim) => (
          <Card key={dim}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                {segmentMeta?.[dim]?.label ?? dim}
              </CardTitle>
              <CardDescription>Relative lift in {primaryLabel} by {(segmentMeta?.[dim]?.label ?? dim).toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentChart segments={byDimension[dim]} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  const acc: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (acc[k] ||= []).push(item);
  }
  return acc;
}
