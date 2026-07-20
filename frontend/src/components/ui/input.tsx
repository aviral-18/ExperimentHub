import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-surface/60 px-3 py-2 text-sm transition-colors",
        "placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50 tnum",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[90px] w-full rounded-lg border border-input bg-surface/60 px-3 py-2 text-sm transition-colors resize-none",
      "placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium text-foreground/90 leading-none", className)}
    {...props}
  />
));
Label.displayName = "Label";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full appearance-none rounded-lg border border-input bg-surface/60 px-3 py-2 text-sm transition-colors cursor-pointer",
      "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
