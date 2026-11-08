import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function FilterChip({
  active = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-[background,box-shadow,color,border-color,transform] duration-200 active:scale-[0.97]",
        active
          ? "border-[color-mix(in_oklch,var(--primary),black_10%)] bg-[linear-gradient(180deg,var(--primary-top),var(--primary))] text-primary-foreground shadow-elev-primary"
          : "border-border/70 bg-[linear-gradient(180deg,var(--card-top),var(--card-bottom))] text-muted-foreground shadow-xs hover:border-border hover:text-foreground hover:shadow-sm",
        className
      )}
      {...props}
    />
  );
}
