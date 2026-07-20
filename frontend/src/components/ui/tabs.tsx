import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/50 p-1", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-active"
                className="absolute inset-0 rounded-lg bg-elevated border border-border shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {item.icon}
              {item.label}
              {item.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
