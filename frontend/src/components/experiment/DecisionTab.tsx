import { motion } from "framer-motion";
import { CheckCircle2, MinusCircle, XCircle, Gauge, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DecisionBadge } from "@/components/common/Badges";
import { Progress } from "@/components/ui/misc";
import { DECISION_META } from "@/lib/decisions";
import { cn } from "@/lib/utils";
import type { DecisionFactor, Report } from "@/types";

const STATUS_ICON = {
  positive: <CheckCircle2 className="size-4 text-success" />,
  neutral: <MinusCircle className="size-4 text-muted-foreground" />,
  negative: <XCircle className="size-4 text-danger" />,
};

export function DecisionTab({ report }: { report: Report }) {
  const meta = DECISION_META[report.decision];
  const factors: DecisionFactor[] = report.sections.decision_factors ?? [];

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <Card className="overflow-hidden" style={{ borderColor: `${meta.color}44` }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DecisionBadge decision={report.decision} />
              <span className="text-sm text-muted-foreground">{meta.blurb}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-snug">{report.headline}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {(report.sections.recommendation ?? "").replace(/\*\*/g, "")}
            </p>
          </CardContent>
          <div className="flex flex-col items-center justify-center gap-1 border-t border-border p-6 md:border-l md:border-t-0" style={{ minWidth: 180 }}>
            <Gauge className="size-5" style={{ color: meta.color }} />
            <div className="text-3xl font-bold tnum">{report.confidence_score.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">confidence / 100</div>
            <Progress value={report.confidence_score} className="mt-2 w-28" indicatorClassName="" />
          </div>
        </div>
      </Card>

      {/* Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /> Decision Factors</CardTitle>
          <CardDescription>How the launch engine weighed the evidence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {factors.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface/40 p-3.5"
            >
              <div className="mt-0.5">{STATUS_ICON[f.status]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{f.label}</span>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tnum",
                      f.status === "positive" && "text-success",
                      f.status === "negative" && "text-danger",
                      f.status === "neutral" && "text-muted-foreground"
                    )}
                  >
                    {f.value}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
              </div>
              <div className="hidden shrink-0 text-right text-[11px] text-muted-foreground sm:block">
                weight
                <div className="font-semibold tnum text-foreground/70">{Math.round(f.weight * 100)}%</div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
