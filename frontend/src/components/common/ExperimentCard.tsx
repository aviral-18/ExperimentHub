import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Users, Clock, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge, DecisionBadge } from "./Badges";
import { useMetrics } from "@/hooks/queries";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import type { ExperimentSummary } from "@/types";

export function ExperimentCard({
  exp,
  index = 0,
  menu,
}: {
  exp: ExperimentSummary;
  index?: number;
  menu?: React.ReactNode;
}) {
  const { data: metrics } = useMetrics();
  const metric = metrics?.find((m) => m.key === exp.primary_metric_key);
  const lift = exp.primary_lift_pct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/experiments/${exp.id}`}>
        <Card hover className="group h-full p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded-md bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {exp.area}
                </span>
                <StatusBadge status={exp.status} />
              </div>
              <h3 className="truncate font-semibold leading-tight group-hover:text-primary transition-colors">
                {exp.name}
              </h3>
            </div>
            {menu ?? (
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            )}
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Target className="size-3.5" /> {metric?.label ?? exp.primary_metric_key}
              </div>
              {lift !== null && lift !== undefined ? (
                <div
                  className={`mt-0.5 text-xl font-bold tnum ${lift >= 0 ? "text-success" : "text-danger"}`}
                >
                  {lift >= 0 ? "+" : ""}
                  {lift.toFixed(2)}%
                </div>
              ) : (
                <div className="mt-0.5 text-xl font-bold text-muted-foreground">—</div>
              )}
            </div>
            {exp.decision && <DecisionBadge decision={exp.decision} />}
          </div>

          <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {formatCompact(exp.total_users)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {exp.duration_days}d
            </span>
            <span className="ml-auto">{formatRelativeTime(exp.updated_at)}</span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
