import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Rocket,
  TrendingUp,
  IndianRupee,
  Activity,
  Trophy,
  Plus,
  ArrowRight,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { DecisionBadge, StatusBadge } from "@/components/common/Badges";
import { DonutChart } from "@/components/charts/DonutChart";
import { AreaLiftChart } from "@/components/charts/ComparisonChart";
import { EmptyState } from "@/components/common/EmptyState";
import { useDashboard } from "@/hooks/queries";
import { useAuth } from "@/hooks/useAuth";
import { DECISION_META } from "@/lib/decisions";
import { formatCompact, formatCurrencyCompact, formatRelativeTime } from "@/lib/format";
import type { Decision } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) return <DashboardSkeleton />;

  const t = data.totals;
  const decisionData = Object.entries(data.decision_distribution).map(([k, v]) => ({
    name: DECISION_META[k as Decision]?.label ?? k,
    value: v,
    color: DECISION_META[k as Decision]?.color ?? "hsl(var(--muted-foreground))",
  }));

  return (
    <div>
      <PageHeader
        eyebrow={`Welcome back, ${user?.full_name?.split(" ")[0] ?? "there"}`}
        title="Experimentation Overview"
        description="Portfolio-level health of every experiment across your product areas."
        actions={
          <Link to="/experiments/new">
            <Button><Plus className="size-4" /> New Experiment</Button>
          </Link>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Total Experiments" value={t.total_experiments} icon={FlaskConical} accent="hsl(var(--primary))"
          footer={<span className="text-muted-foreground">{t.draft_experiments} drafts</span>} />
        <StatCard index={1} label="Running" value={t.running_experiments} icon={Activity} accent="hsl(var(--info))"
          footer={<span className="text-muted-foreground">live now</span>} />
        <StatCard index={2} label="Successful Launches" value={t.successful_launches} icon={Rocket} accent="hsl(var(--success))"
          footer={<span className="text-muted-foreground">{t.win_rate_pct}% win rate</span>} />
        <StatCard index={3} label="Avg Primary Lift" value={`${t.average_lift_pct >= 0 ? "+" : ""}${t.average_lift_pct}%`} icon={TrendingUp}
          accent="hsl(var(--accent))" footer={<span className="text-muted-foreground">across analysed tests</span>} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard index={4} label="Projected Revenue Impact" value={formatCurrencyCompact(t.revenue_impact)} icon={IndianRupee}
          accent="hsl(var(--success))" footer={<span className="text-muted-foreground">annualised, from launched wins</span>} />
        <StatCard index={5} label="Completed" value={t.completed_experiments} icon={Trophy} accent="hsl(var(--warning))"
          footer={<span className="text-muted-foreground">fully analysed</span>} />
        <StatCard index={6} label="Win Rate" value={`${t.win_rate_pct}%`} icon={Target} accent="hsl(280 70% 68%)"
          footer={<span className="text-muted-foreground">significant positive results</span>} />
      </div>

      {/* Charts + recent */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent experiments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Recent Experiments</CardTitle>
                <CardDescription>Latest activity across your workspace</CardDescription>
              </div>
              <Link to="/experiments">
                <Button variant="ghost" size="sm">View all <ArrowRight className="size-4" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.recent_experiments.length === 0 ? (
                <EmptyState
                  icon={<FlaskConical className="size-6" />}
                  title="No experiments yet"
                  description="Create your first experiment to see it here."
                  action={<Link to="/experiments/new"><Button size="sm"><Plus className="size-4" /> New Experiment</Button></Link>}
                />
              ) : (
                data.recent_experiments.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/experiments/${e.id}`}
                      className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-elevated/50"
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-elevated text-xs font-semibold text-muted-foreground">
                        {e.area.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground">{e.area} · {formatRelativeTime(e.updated_at)}</div>
                      </div>
                      {e.lift_pct !== null && (
                        <div className={`hidden text-sm font-semibold tnum sm:block ${e.lift_pct >= 0 ? "text-success" : "text-danger"}`}>
                          {e.lift_pct >= 0 ? "+" : ""}{e.lift_pct.toFixed(2)}%
                        </div>
                      )}
                      {e.decision ? <DecisionBadge decision={e.decision} /> : <StatusBadge status={e.status} />}
                    </Link>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Decision Mix</CardTitle>
              <CardDescription>How experiments resolved</CardDescription>
            </CardHeader>
            <CardContent>
              {decisionData.length ? (
                <>
                  <DonutChart
                    data={decisionData}
                    centerValue={String(decisionData.reduce((s, d) => s + d.value, 0))}
                    centerLabel="analysed"
                  />
                  <div className="mt-4 space-y-1.5">
                    {decisionData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="size-2.5 rounded-[3px]" style={{ background: d.color }} /> {d.name}
                        </span>
                        <span className="font-semibold tnum">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No analysed experiments yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avg Lift by Area</CardTitle>
              <CardDescription>Where impact concentrates</CardDescription>
            </CardHeader>
            <CardContent>
              {data.area_summary.length ? (
                <AreaLiftChart data={data.area_summary.slice(0, 7)} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-2 h-5 w-96" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
