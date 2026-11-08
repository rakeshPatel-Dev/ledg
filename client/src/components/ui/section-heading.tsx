import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ title, icon, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-2.5 flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {icon ? (
          <span className="flex size-6 items-center justify-center rounded-md border border-border/50 bg-card text-muted-foreground shadow-xs">
            {icon}
          </span>
        ) : null}
        {title}
      </h2>
      {action}
    </div>
  );
}
