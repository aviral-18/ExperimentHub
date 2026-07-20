import type { Decision, ExperimentStatus } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "secondary";

export const DECISION_META: Record<
  Decision,
  { label: string; variant: BadgeVariant; color: string; blurb: string }
> = {
  launch: {
    label: "Launch",
    variant: "success",
    color: "hsl(var(--success))",
    blurb: "Ship the treatment to 100% of traffic.",
  },
  iterate: {
    label: "Iterate",
    variant: "warning",
    color: "hsl(var(--warning))",
    blurb: "Refine or keep running before deciding.",
  },
  rollback: {
    label: "Rollback",
    variant: "danger",
    color: "hsl(var(--danger))",
    blurb: "Revert — the treatment underperforms.",
  },
  stop: {
    label: "Stop",
    variant: "secondary",
    color: "hsl(var(--muted-foreground))",
    blurb: "End the test; no meaningful effect.",
  },
  inconclusive: {
    label: "Inconclusive",
    variant: "info",
    color: "hsl(var(--info))",
    blurb: "Not enough evidence to decide.",
  },
};

export const STATUS_META: Record<
  ExperimentStatus,
  { label: string; variant: BadgeVariant; dot: string }
> = {
  draft: { label: "Draft", variant: "secondary", dot: "hsl(var(--muted-foreground))" },
  running: { label: "Running", variant: "info", dot: "hsl(var(--info))" },
  completed: { label: "Completed", variant: "success", dot: "hsl(var(--success))" },
  archived: { label: "Archived", variant: "secondary", dot: "hsl(var(--muted-foreground))" },
};

/**
 * Chart palette — validated for colour-blind safety (scripts/validate_palette.js).
 * control (warm neutral) ↔ treatment (indigo): ΔE 24.5 normal / 13.7 tritan — the
 * only same-chart categorical pair. control is deliberately recessive (baseline);
 * identity is always reinforced with a legend, direct labels and line style, so it
 * never relies on colour alone. positive/negative/accent are reserved status hues.
 */
export const CHART = {
  control: "#a89482", // warm neutral baseline (recedes)
  treatment: "#7c6cff", // brand indigo for the new variant
  positive: "#3fcf8e",
  negative: "#ef5a78",
  accent: "#22c6e6",
  warning: "#f0a63a",
  grid: "hsl(225 16% 20%)",
  axis: "hsl(220 12% 55%)",
};

export const AREA_COLORS = [
  "hsl(245 80% 68%)",
  "hsl(190 90% 55%)",
  "hsl(152 58% 52%)",
  "hsl(38 92% 60%)",
  "hsl(280 70% 68%)",
  "hsl(352 78% 64%)",
  "hsl(210 90% 62%)",
];
