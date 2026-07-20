import { CHART } from "@/lib/decisions";

export interface CIRow {
  label: string;
  low: number; // relative % lower bound
  high: number; // relative % upper bound
  point: number; // relative % point estimate
  significant: boolean;
  improvement: boolean;
  isPrimary?: boolean;
}

/**
 * Forest plot of relative-lift confidence intervals across metrics on one shared
 * axis, with a zero reference line. A CI that crosses zero = not significant.
 * Colour is reinforced by an explicit ✓/– marker and the axis, never colour-alone.
 */
export function ConfidenceIntervalChart({ rows }: { rows: CIRow[] }) {
  if (!rows.length) return null;

  const lows = rows.map((r) => r.low);
  const highs = rows.map((r) => r.high);
  let min = Math.min(0, ...lows);
  let max = Math.max(0, ...highs);
  const pad = (max - min) * 0.08 || 1;
  min -= pad;
  max += pad;
  const span = max - min || 1;
  const toPct = (v: number) => ((v - min) / span) * 100;
  const zeroX = toPct(0);

  return (
    <div className="w-full">
      {/* Zero line label */}
      <div className="relative mb-2 h-4 text-[10px] text-muted-foreground">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${zeroX}%` }}
        >
          no effect (0%)
        </span>
      </div>

      <div className="relative space-y-2.5">
        {/* Zero reference line spanning all rows */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-muted-foreground/40"
          style={{ left: `${zeroX}%` }}
        />
        {rows.map((r) => {
          const color = r.significant
            ? r.improvement
              ? CHART.positive
              : CHART.negative
            : CHART.control;
          const left = toPct(Math.min(r.low, r.high));
          const width = Math.abs(toPct(r.high) - toPct(r.low));
          const pointX = toPct(r.point);
          return (
            <div key={r.label} className="group grid grid-cols-[150px_1fr_64px] items-center gap-3">
              <div
                className={`truncate text-xs ${r.isPrimary ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                title={r.label}
              >
                {r.isPrimary && <span className="mr-1 text-primary">★</span>}
                {r.label}
              </div>
              <div className="relative h-6">
                {/* CI bar */}
                <div
                  className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full transition-all"
                  style={{ left: `${left}%`, width: `${width}%`, background: `${color}55` }}
                />
                {/* Point estimate */}
                <div
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background"
                  style={{ left: `${pointX}%`, background: color }}
                />
              </div>
              <div className="text-right text-xs font-semibold tnum" style={{ color }}>
                {r.point > 0 ? "+" : ""}
                {r.point.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
