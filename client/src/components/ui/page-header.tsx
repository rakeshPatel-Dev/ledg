import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small uppercase context line above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-px w-5 bg-primary/45" aria-hidden="true" />
            <span className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </span>
          </div>
        ) : null}
        <h1 className="text-[1.7rem] font-extrabold leading-none tracking-[-0.035em] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
