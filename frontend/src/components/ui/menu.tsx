import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/** Minimal accessible dropdown menu (click-outside + escape to close). */
export function Menu({
  items,
  className,
  trigger,
  align = "right",
}: {
  items: MenuItem[];
  className?: string;
  trigger?: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          trigger
            ? "inline-flex"
            : "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
        }
      >
        {trigger ?? <MoreVertical className="size-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-50 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-elevated p-1 shadow-xl",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  item.danger
                    ? "text-danger hover:bg-danger/10"
                    : "text-foreground hover:bg-surface"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
