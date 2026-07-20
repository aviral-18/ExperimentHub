import { CHART } from "@/lib/decisions";
import { formatCompact, formatNumber } from "@/lib/format";
import { ChartLegend } from "./common";

interface Stage {
  stage: string;
  count: number;
}

export function FunnelChart({
  control,
  treatment,
  controlName = "Control",
  treatmentName = "Treatment",
}: {
  control: Stage[];
  treatment: Stage[];
  controlName?: string;
  treatmentName?: string;
}) {
  const top = Math.max(control[0]?.count ?? 1, treatment[0]?.count ?? 1);

  return (
    <div className="space-y-4">
      <ChartLegend
        items={[
          { label: controlName, color: CHART.control },
          { label: treatmentName, color: CHART.treatment },
        ]}
      />
      <div className="space-y-3">
        {control.map((stage, i) => {
          const t = treatment[i];
          const cPct = (stage.count / top) * 100;
          const tPct = ((t?.count ?? 0) / top) * 100;
          const cStep = i > 0 && control[i - 1].count ? (stage.count / control[i - 1].count) * 100 : 100;
          const tStep =
            i > 0 && treatment[i - 1].count ? ((t?.count ?? 0) / treatment[i - 1].count) * 100 : 100;
          return (
            <div key={stage.stage}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{stage.stage}</span>
                {i > 0 && (
                  <span className="tnum text-muted-foreground">
                    step: <span style={{ color: CHART.control }}>{cStep.toFixed(0)}%</span>
                    {" / "}
                    <span style={{ color: CHART.treatment }}>{tStep.toFixed(0)}%</span>
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <Bar pct={cPct} color={CHART.control} count={stage.count} />
                <Bar pct={tPct} color={CHART.treatment} count={t?.count ?? 0} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ pct, color, count }: { pct: number; color: string; count: number }) {
  return (
    <div className="group flex items-center gap-2">
      <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/40">
        <div
          className="flex h-full items-center justify-end rounded-md px-2 transition-all duration-700 ease-out"
          style={{ width: `${Math.max(pct, 4)}%`, background: `${color}` }}
          title={formatNumber(count)}
        >
          <span className="text-[10px] font-semibold text-black/70">{formatCompact(count)}</span>
        </div>
      </div>
    </div>
  );
}
