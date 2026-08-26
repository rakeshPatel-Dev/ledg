import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

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
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <div className="flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary ring-4 ring-primary/5">
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
