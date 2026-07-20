import * as React from "react";
import { cn } from "@/lib/utils";

/** Loading skeleton block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

/** Thin progress/meter bar. */
export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted/70", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all duration-700 ease-out", indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** Simple, dependency-free tooltip on hover. */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-foreground shadow-xl animate-fade-in",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/** Divider with optional label. */
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <div className={cn("h-px w-full bg-border", className)} />;
  return (
    <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <div className="h-px flex-1 bg-border" />
      <span className="uppercase tracking-wider">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Small key/value stat used in detail panels. */
export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tnum">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
