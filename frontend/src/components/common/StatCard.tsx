import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  accent = "hsl(var(--primary))",
  index = 0,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  accent?: string;
  index?: number;
  footer?: React.ReactNode;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card hover className="relative overflow-hidden p-5">
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-[0.12] blur-2xl"
          style={{ background: accent }}
        />
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div
            className="grid size-9 place-items-center rounded-lg"
            style={{ background: `${accent}1f`, color: accent }}
          >
            <Icon className="size-[18px]" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tnum lg:text-[26px]">{value}</div>
        {(delta !== undefined || footer) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  positive ? "text-success" : "text-danger"
                )}
              >
                {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {positive ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            )}
            {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
            {footer}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
