import { Badge } from "@/components/ui/badge";
import { DECISION_META, STATUS_META } from "@/lib/decisions";
import type { Decision, ExperimentStatus } from "@/types";
import { CheckCircle2, RefreshCw, Undo2, CircleSlash, HelpCircle } from "lucide-react";

const DECISION_ICON: Record<Decision, React.ReactNode> = {
  launch: <CheckCircle2 className="size-3.5" />,
  iterate: <RefreshCw className="size-3.5" />,
  rollback: <Undo2 className="size-3.5" />,
  stop: <CircleSlash className="size-3.5" />,
  inconclusive: <HelpCircle className="size-3.5" />,
};

export function DecisionBadge({ decision }: { decision: Decision }) {
  const meta = DECISION_META[decision];
  return (
    <Badge variant={meta.variant} className="gap-1">
      {DECISION_ICON[decision]}
      {meta.label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} className="gap-1.5">
      <span
        className={`size-1.5 rounded-full ${status === "running" ? "animate-pulse" : ""}`}
        style={{ background: meta.dot }}
      />
      {meta.label}
    </Badge>
  );
}

export function SignificanceBadge({ significant }: { significant: boolean | null }) {
  if (significant === null) return <Badge variant="secondary">No data</Badge>;
  return significant ? (
    <Badge variant="success">Significant</Badge>
  ) : (
    <Badge variant="secondary">Not significant</Badge>
  );
}
