import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, AREA_COLORS } from "@/lib/decisions";
import { axisProps, ChartTooltip, gridProps } from "./common";

/** Grouped/simple bar chart. Colour encodes entity identity in fixed order. */
export function AreaLiftChart({
  data,
}: {
  data: { area: string; avg_lift: number; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 42)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
        <CartesianGrid {...gridProps} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="area" {...axisProps} width={92} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
          content={<ChartTooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />}
        />
        <Bar dataKey="avg_lift" name="Avg lift" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Two-bar control vs treatment comparison for a single metric value. */
export function VariantValueBars({
  controlValue,
  treatmentValue,
  format,
  controlName = "Control",
  treatmentName = "Treatment",
}: {
  controlValue: number;
  treatmentValue: number;
  format: (v: number) => string;
  controlName?: string;
  treatmentName?: string;
}) {
  const data = [
    { name: controlName, value: controlValue, fill: CHART.control },
    { name: treatmentName, value: treatmentValue, fill: CHART.treatment },
  ];
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} width={54} tickFormatter={(v) => format(v)} />
        <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} content={<ChartTooltip formatter={(v) => format(v)} />} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={64}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
