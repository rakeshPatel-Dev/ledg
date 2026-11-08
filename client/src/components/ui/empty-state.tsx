import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Use "destructive" for failures so they cannot be mistaken for empty data. */
  tone?: "default" | "destructive";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-3xl ring-4",
            tone === "destructive"
              ? "bg-destructive/10 text-destructive shadow-sm ring-destructive/5"
              : "bg-primary/10 text-primary shadow-sm ring-primary/5"
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-bold tracking-tight text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-xs text-xs font-medium text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
