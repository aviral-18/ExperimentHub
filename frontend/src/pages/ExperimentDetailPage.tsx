import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Loader2,
  Sparkles,
  BarChart3,
  Layers,
  Gauge,
  LayoutGrid,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/Badges";
import { EmptyState } from "@/components/common/EmptyState";
import { OverviewTab } from "@/components/experiment/OverviewTab";
import { StatisticsTab } from "@/components/experiment/StatisticsTab";
import { SegmentsTab } from "@/components/experiment/SegmentsTab";
import { InsightsTab } from "@/components/experiment/InsightsTab";
import { DecisionTab } from "@/components/experiment/DecisionTab";
import { useExperiment, useAnalysis, useRunExperiment, useMutateExperiment, useMetrics } from "@/hooks/queries";
import { downloadCsv, downloadExcel, downloadPdf } from "@/lib/exports";
import { apiErrorMessage } from "@/services/api";

const TABS = [
  { value: "overview", label: "Overview", icon: <LayoutGrid className="size-4" /> },
  { value: "statistics", label: "Statistics", icon: <BarChart3 className="size-4" /> },
  { value: "segments", label: "Segments", icon: <Layers className="size-4" /> },
  { value: "insights", label: "AI Analysis", icon: <Sparkles className="size-4" /> },
  { value: "decision", label: "Decision", icon: <Gauge className="size-4" /> },
];

export default function ExperimentDetailPage() {
  const { id } = useParams();
  const expId = Number(id);
  const [tab, setTab] = useState("overview");

  const { data: experiment, isLoading: expLoading } = useExperiment(expId);
  const { data: metrics } = useMetrics();
  const { data: analysis, isLoading: analysisLoading, isError: analysisError } = useAnalysis(expId);
  const runMut = useRunExperiment();
  const { setStatus } = useMutateExperiment();

  const hasResults = !!analysis && !analysisError;

  async function run() {
    toast.promise(runMut.mutateAsync({ id: expId }), {
      loading: "Simulating 100k users & running analysis…",
      success: "Analysis complete",
      error: (e) => apiErrorMessage(e),
    });
  }

  if (expLoading || !experiment) return <DetailSkeleton />;

  const control = experiment.variants.find((v) => v.role === "control")?.name ?? "Control";
  const treatment = experiment.variants.find((v) => v.role === "treatment")?.name ?? "Treatment";
  const decision = analysis?.report.decision;

  const exportItems = hasResults && metrics
    ? [
        { label: "Executive PDF", icon: <FileText className="size-4" />, onClick: () => wrap(() => downloadPdf(experiment, analysis!, metrics)) },
        { label: "Excel workbook", icon: <FileSpreadsheet className="size-4" />, onClick: () => wrap(() => downloadExcel(experiment, analysis!, metrics)) },
        { label: "CSV results", icon: <FileDown className="size-4" />, onClick: () => wrap(() => downloadCsv(experiment)) },
      ]
    : [];

  return (
    <div>
      {/* Breadcrumb + header */}
      <Link to="/experiments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Experiments
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{experiment.area}</span>
            <StatusBadge status={experiment.status} />
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{control} vs {treatment}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-[28px]">{experiment.name}</h1>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasResults && exportItems.length > 0 && (
            <Menu
              items={exportItems}
              trigger={
                <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <Download className="size-4" /> Export
                </span>
              }
            />
          )}
          {decision === "launch" && experiment.status !== "running" && (
            <Button
              variant="success"
              onClick={() =>
                toast.promise(setStatus.mutateAsync({ id: expId, status: "running" }), {
                  loading: "Launching…",
                  success: "Feature launched to production 🚀",
                  error: (e) => apiErrorMessage(e),
                })
              }
            >
              <Rocket className="size-4" /> Launch Feature
            </Button>
          )}
          <Button onClick={run} disabled={runMut.isPending}>
            {runMut.isPending ? <Loader2 className="size-4 animate-spin" /> : hasResults ? <RefreshCw className="size-4" /> : <Play className="size-4" />}
            {hasResults ? "Re-run" : "Run Analysis"}
          </Button>
        </div>
      </div>

      {/* No results state */}
      {!hasResults && !analysisLoading ? (
        <>
          <Card className="mb-6 border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Play className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Ready to run</h3>
                  <p className="mt-0.5 max-w-md text-sm text-muted-foreground">
                    Simulate {experiment.total_users.toLocaleString()} synthetic users, compute the statistics and
                    generate a launch recommendation.
                  </p>
                </div>
              </div>
              <Button onClick={run} disabled={runMut.isPending} size="lg">
                {runMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Run Analysis
              </Button>
            </CardContent>
          </Card>
          <OverviewTab experiment={experiment} analysis={null} metrics={metrics ?? []} />
        </>
      ) : analysisLoading ? (
        <DetailSkeleton tabsOnly />
      ) : (
        <>
          <Tabs items={TABS} value={tab} onChange={setTab} className="mb-6 max-w-2xl" />
          {tab === "overview" && <OverviewTab experiment={experiment} analysis={analysis!} metrics={metrics ?? []} />}
          {tab === "statistics" && (
            <StatisticsTab analysis={analysis!} metrics={metrics ?? []} controlName={control} treatmentName={treatment} />
          )}
          {tab === "segments" && <SegmentsTab analysis={analysis!} metrics={metrics ?? []} />}
          {tab === "insights" && <InsightsTab report={analysis!.report} />}
          {tab === "decision" && <DecisionTab report={analysis!.report} />}
        </>
      )}
    </div>
  );
}

function wrap(fn: () => void | Promise<void>) {
  try {
    const r = fn();
    if (r instanceof Promise) r.catch((e) => toast.error(apiErrorMessage(e, "Export failed")));
  } catch (e) {
    toast.error(apiErrorMessage(e, "Export failed"));
  }
}

function DetailSkeleton({ tabsOnly }: { tabsOnly?: boolean }) {
  return (
    <div>
      {!tabsOnly && (
        <>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-4 h-9 w-96" />
        </>
      )}
      <Skeleton className="mt-6 h-10 w-full max-w-2xl rounded-xl" />
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-xl lg:col-span-2" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
