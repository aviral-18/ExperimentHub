import type { ReactNode } from "react";
import { CHART } from "@/lib/decisions";

/** Shared axis styling for recharts XAxis/YAxis. */
export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART.grid },
} as const;

export const gridProps = {
  stroke: CHART.grid,
  strokeDasharray: "3 3",
  vertical: false,
} as const;

/** Custom, theme-aware tooltip. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  formatter?: (value: number, name: string, entry: any) => ReactNode;
  labelFormatter?: (label: any) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-elevated/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined && (
        <div className="mb-1.5 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block size-2.5 rounded-[3px]"
                style={{ background: entry.color || entry.fill }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tnum text-foreground">
              {formatter
                ? formatter(entry.value, entry.name, entry)
                : entry.value?.toLocaleString?.() ?? entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Direct-label legend used above/below charts (identity, never colour-alone). */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-4 text-xs text-muted-foreground ${className ?? ""}`}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          {it.dashed ? (
            <svg width="18" height="8" className="shrink-0">
              <line x1="0" y1="4" x2="18" y2="4" stroke={it.color} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
          ) : (
            <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}
