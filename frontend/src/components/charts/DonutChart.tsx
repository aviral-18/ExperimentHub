import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./common";

/** Donut for categorical composition (decision mix, traffic split). */
export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 200,
}: {
  data: { name: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="hsl(var(--surface))"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltip
                formatter={(v) => `${v} (${total ? ((Number(v) / total) * 100).toFixed(0) : 0}%)`}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <div className="text-2xl font-bold tnum">{centerValue}</div>}
          {centerLabel && <div className="text-xs text-muted-foreground">{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}
