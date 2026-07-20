import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisionBadge } from "@/components/common/Badges";
import { DECISION_META } from "@/lib/decisions";
import { formatCurrencyCompact, formatPValue } from "@/lib/format";
import { relativeCI } from "./helpers";
import type { MetricSpec, Report, StatResult } from "@/types";

export function ResultHero({
  primary,
  report,
  spec,
  controlName,
  treatmentName,
  fmt,
}: {
  primary: StatResult;
  report: Report;
  spec?: MetricSpec;
  controlName: string;
  treatmentName: string;
  fmt: (key: string, v: number) => string;
}) {
  const positive = primary.relative_lift_pct >= 0;
  const rci = relativeCI(primary);
  const meta = DECISION_META[report.decision];
  const projected = report.sections.projected_annual_revenue ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Primary result */}
      <Card className="lg:col-span-2 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr]">
          <div className="p-6">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Primary metric · {spec?.label}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-4xl font-bold tnum ${positive ? "text-success" : "text-danger"}`}
              >
                {positive ? "+" : ""}
                {primary.relative_lift_pct.toFixed(2)}%
              </motion.span>
              {positive ? (
                <TrendingUp className="size-6 text-success" />
              ) : (
                <TrendingDown className="size-6 text-danger" />
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              relative lift · {Math.round(primary.ci_level * 100)}% CI [{rci.low >= 0 ? "+" : ""}
              {rci.low.toFixed(1)}%, {rci.high >= 0 ? "+" : ""}
              {rci.high.toFixed(1)}%]
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {primary.significant ? (
                <Badge variant="success">Statistically significant</Badge>
              ) : (
                <Badge variant="secondary">Not significant</Badge>
              )}
              <Badge variant="outline">p = {formatPValue(primary.p_value)}</Badge>
              <Badge variant="outline">power {(primary.achieved_power * 100).toFixed(0)}%</Badge>
              <Badge variant="outline">{primary.effect_label} effect</Badge>
            </div>
          </div>

          {/* Values */}
          <div className="flex flex-col justify-center gap-3 border-t border-border bg-surface/40 p-6 sm:border-l sm:border-t-0">
            <ValueRow color="var(--control)" label={controlName} value={fmt(primary.metric_key, primary.control_value)} dashed />
            <ValueRow color="var(--treatment)" label={treatmentName} value={fmt(primary.metric_key, primary.treatment_value)} />
            <div className="mt-1 border-t border-border pt-3 text-xs text-muted-foreground">
              {primary.test_name}
            </div>
          </div>
        </div>
      </Card>

      {/* Decision */}
      <Card
        className="relative overflow-hidden p-6"
        style={{ borderColor: `${meta.color}55` }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-20 blur-3xl"
          style={{ background: meta.color }}
        />
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Launch Recommendation
        </div>
        <div className="mt-3 flex items-center gap-3">
          <DecisionBadge decision={report.decision} />
          <span className="text-sm text-muted-foreground">{meta.blurb}</span>
        </div>

        {/* Confidence ring */}
        <div className="mt-5 flex items-center gap-4">
          <ConfidenceRing value={report.confidence_score} color={meta.color} />
          <div>
            <div className="text-2xl font-bold tnum">{report.confidence_score.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">decision confidence</div>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-surface/40 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IndianRupee className="size-3.5" /> Projected annual revenue
          </div>
          <div className={`mt-0.5 text-lg font-bold tnum ${projected >= 0 ? "text-success" : "text-danger"}`}>
            {projected >= 0 ? "" : "-"}
            {formatCurrencyCompact(Math.abs(projected))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ValueRow({ color, label, value, dashed }: { color: string; label: string; value: string; dashed?: boolean }) {
  const c = color === "var(--control)" ? "#a89482" : "#7c6cff";
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {dashed ? (
          <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={c} strokeWidth="2.5" strokeDasharray="4 3" /></svg>
        ) : (
          <span className="h-[3px] w-4 rounded-full" style={{ background: c }} />
        )}
        {label}
      </span>
      <span className="text-lg font-semibold tnum">{value}</span>
    </div>
  );
}

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="64" height="64" className="-rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
      <motion.circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}
