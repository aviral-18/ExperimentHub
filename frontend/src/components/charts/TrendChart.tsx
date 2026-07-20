import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { CHART } from "@/lib/decisions";
import { formatMetric } from "@/lib/format";
import { axisProps, ChartLegend, ChartTooltip, gridProps } from "./common";

export function TrendChart({
  days,
  control,
  treatment,
  unit,
  controlName = "Control",
  treatmentName = "Treatment",
}: {
  days: number[];
  control: number[];
  treatment: number[];
  unit: string;
  controlName?: string;
  treatmentName?: string;
}) {
  const data = days.map((d, i) => ({
    day: d,
    control: control[i],
    treatment: treatment[i],
  }));

  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: controlName, color: CHART.control, dashed: true },
          { label: treatmentName, color: CHART.treatment },
        ]}
      />
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="day"
            {...axisProps}
            tickFormatter={(d) => `D${d}`}
            interval="preserveStartEnd"
          />
          <YAxis
            {...axisProps}
            width={54}
            tickFormatter={(v) => formatMetric(unit, v).replace(" min", "")}
            domain={["auto", "auto"]}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(d) => `Day ${d}`}
                formatter={(v) => formatMetric(unit, v)}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="control"
            name={controlName}
            stroke={CHART.control}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="treatment"
            name={treatmentName}
            stroke={CHART.treatment}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
