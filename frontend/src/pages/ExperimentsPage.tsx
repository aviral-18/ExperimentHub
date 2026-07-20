import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Plus,
  FlaskConical,
  Copy,
  Archive,
  Trash2,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ExperimentCard } from "@/components/common/ExperimentCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { useExperiments, useMutateExperiment, useRunExperiment } from "@/hooks/queries";
import { apiErrorMessage } from "@/services/api";
import type { ExperimentSummary } from "@/types";

const AREAS = ["all", "Checkout", "Growth", "Discovery", "Homepage", "Search", "Pricing", "Payments", "Menu"];

export default function ExperimentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [area, setArea] = useState("all");
  const [sort, setSort] = useState("recent");
  const [confirmDelete, setConfirmDelete] = useState<ExperimentSummary | null>(null);

  const { data, isLoading } = useExperiments({ status, area, sort });
  const { duplicate, remove, setStatus: setStatusMut } = useMutateExperiment();
  const runMut = useRunExperiment();

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((e) => e.name.toLowerCase().includes(q) || e.area.toLowerCase().includes(q));
  }, [data, search]);

  async function handleRun(id: number) {
    toast.promise(runMut.mutateAsync({ id }), {
      loading: "Simulating 100k users & analysing…",
      success: "Analysis complete",
      error: (e) => apiErrorMessage(e),
    });
  }

  return (
    <div>
      <PageHeader
        title="Experiments"
        description="Search, filter and manage every experiment in your workspace."
        actions={
          <Link to="/experiments/new">
            <Button><Plus className="size-4" /> New Experiment</Button>
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search experiments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[120px]">
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>
          <Select value={area} onChange={(e) => setArea(e.target.value)} className="w-auto min-w-[120px]">
            {AREAS.map((a) => (
              <option key={a} value={a}>{a === "all" ? "All areas" : a}</option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto min-w-[110px]">
            <option value="recent">Most recent</option>
            <option value="name">Name (A–Z)</option>
            <option value="lift">Highest lift</option>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="size-6" />}
          title={search || status !== "all" || area !== "all" ? "No matching experiments" : "No experiments yet"}
          description={
            search || status !== "all" || area !== "all"
              ? "Try adjusting your filters or search."
              : "Create your first experiment to get started."
          }
          action={<Link to="/experiments/new"><Button><Plus className="size-4" /> New Experiment</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((exp, i) => (
            <ExperimentCard
              key={exp.id}
              exp={exp}
              index={i}
              menu={
                <Menu
                  items={[
                    ...(exp.status !== "archived"
                      ? [{ label: "Run analysis", icon: <Play className="size-4" />, onClick: () => handleRun(exp.id) }]
                      : []),
                    {
                      label: "Duplicate",
                      icon: <Copy className="size-4" />,
                      onClick: () =>
                        toast.promise(duplicate.mutateAsync(exp.id), {
                          loading: "Duplicating…",
                          success: "Experiment duplicated",
                          error: (e) => apiErrorMessage(e),
                        }),
                    },
                    {
                      label: exp.status === "archived" ? "Unarchive" : "Archive",
                      icon: <Archive className="size-4" />,
                      onClick: () =>
                        toast.promise(
                          setStatusMut.mutateAsync({
                            id: exp.id,
                            status: exp.status === "archived" ? "draft" : "archived",
                          }),
                          { loading: "Updating…", success: "Status updated", error: (e) => apiErrorMessage(e) }
                        ),
                    },
                    { label: "Delete", icon: <Trash2 className="size-4" />, danger: true, onClick: () => setConfirmDelete(exp) },
                  ]}
                />
              }
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete experiment?"
        description={`"${confirmDelete?.name}" and all its results will be permanently removed. This cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!confirmDelete) return;
              const id = confirmDelete.id;
              setConfirmDelete(null);
              toast.promise(remove.mutateAsync(id), {
                loading: "Deleting…",
                success: "Experiment deleted",
                error: (e) => apiErrorMessage(e),
              });
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
