import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny sparkline for KPI cards. Single series — no legend needed. */
export function Sparkline({
  values,
  color,
  height = 40,
}: {
  values: number[];
  color: string;
  height?: number;
}) {
  const data = values.map((v, i) => ({ i, v }));
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
