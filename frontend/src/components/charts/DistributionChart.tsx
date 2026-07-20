import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "@/lib/decisions";
import { formatMetric } from "@/lib/format";
import { axisProps, ChartLegend, ChartTooltip, gridProps } from "./common";

export function DistributionChart({
  data,
  unit,
  controlMean,
  treatmentMean,
  controlName = "Control",
  treatmentName = "Treatment",
  height = 240,
}: {
  data: { x: number; control: number; treatment: number }[];
  unit: string;
  controlMean?: number;
  treatmentMean?: number;
  controlName?: string;
  treatmentName?: string;
  height?: number;
}) {
  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: controlName, color: CHART.control },
          { label: treatmentName, color: CHART.treatment },
        ]}
      />
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="distControl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.control} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART.control} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="distTreatment" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.treatment} stopOpacity={0.4} />
              <stop offset="100%" stopColor={CHART.treatment} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="x"
            {...axisProps}
            tickFormatter={(v) => formatMetric(unit, v).replace(" min", "").replace("₹", "₹")}
            type="number"
            domain={["dataMin", "dataMax"]}
          />
          <YAxis {...axisProps} width={40} tickFormatter={() => ""} />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(v) => formatMetric(unit, Number(v))}
                formatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              />
            }
          />
          {controlMean !== undefined && (
            <ReferenceLine x={controlMean} stroke={CHART.control} strokeDasharray="4 3" strokeWidth={1.5} />
          )}
          {treatmentMean !== undefined && (
            <ReferenceLine x={treatmentMean} stroke={CHART.treatment} strokeDasharray="4 3" strokeWidth={1.5} />
          )}
          <Area
            type="monotone"
            dataKey="control"
            name={controlName}
            stroke={CHART.control}
            strokeWidth={2}
            fill="url(#distControl)"
          />
          <Area
            type="monotone"
            dataKey="treatment"
            name={treatmentName}
            stroke={CHART.treatment}
            strokeWidth={2}
            fill="url(#distTreatment)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
