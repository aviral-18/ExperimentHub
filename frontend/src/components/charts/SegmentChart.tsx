import { CHART } from "@/lib/decisions";
import { Tooltip as UITooltip } from "@/components/ui/misc";
import type { SegmentResult } from "@/types";

/**
 * Diverging horizontal bars of per-segment relative lift, centred on zero.
 * Significant segments are saturated; non-significant ones are muted — plus a
 * ✓ marker — so significance is never colour-alone. Reveals heterogeneous
 * treatment effects (and potential Simpson's-paradox traps).
 */
export function SegmentChart({ segments }: { segments: SegmentResult[] }) {
  if (!segments.length) return null;
  const maxAbs = Math.max(...segments.map((s) => Math.abs(s.lift_pct)), 1) * 1.1;

  return (
    <div className="space-y-1.5">
      {segments.map((s) => {
        const positive = s.lift_pct >= 0;
        const color = s.significant ? (positive ? CHART.positive : CHART.negative) : CHART.control;
        const widthPct = (Math.abs(s.lift_pct) / maxAbs) * 50;
        return (
          <div key={`${s.dimension}-${s.segment}`} className="grid grid-cols-[120px_1fr_58px] items-center gap-2">
            <div className="truncate text-xs text-muted-foreground" title={s.segment}>
              {s.segment}
            </div>
            <UITooltip
              content={
                <div className="space-y-0.5">
                  <div className="font-medium">{s.segment}</div>
                  <div>Lift: {s.lift_pct >= 0 ? "+" : ""}{s.lift_pct.toFixed(2)}%</div>
                  <div>p-value: {s.p_value < 0.0001 ? "<0.0001" : s.p_value.toFixed(4)}</div>
                  <div>n: {s.control_n.toLocaleString()} / {s.treatment_n.toLocaleString()}</div>
                </div>
              }
            >
              <div className="relative h-5 w-full">
                <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                <div
                  className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[3px] transition-all"
                  style={{
                    background: color,
                    width: `${widthPct}%`,
                    left: positive ? "50%" : undefined,
                    right: positive ? undefined : "50%",
                  }}
                />
              </div>
            </UITooltip>
            <div className="flex items-center justify-end gap-1 text-right text-xs font-semibold tnum" style={{ color }}>
              {s.significant && <span className="text-[9px]">✓</span>}
              {s.lift_pct >= 0 ? "+" : ""}
              {s.lift_pct.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
