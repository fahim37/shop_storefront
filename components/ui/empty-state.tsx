import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Centered empty/zero-result placeholder. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-soft to-blue-soft/30 text-primary shadow-sm ring-1 ring-inset ring-primary/15 [&>svg]:size-7">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-extrabold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
