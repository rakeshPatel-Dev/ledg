import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  HandCoins,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { useDuesSummary } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DuesSummaryCardProps {
  className?: string;
}

export function DuesSummaryCard({ className }: DuesSummaryCardProps) {
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDuesSummary();

  if (isLoading) return null;

  if (isError) {
    return (
      <Card className="rounded-4xl border border-border/60 p-2">
        <ErrorState
          contained={false}
          className="py-4"
          title="Couldn't load dues"
          description="Your dues totals are hidden until this request succeeds."
          error={error}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      </Card>
    );
  }

  if (!summary) return null;

  const hasDues = summary.activeCount > 0 || summary.owedToMe > 0 || summary.iOwe > 0;
  if (!hasDues) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Layered sheet underneath — depth via stacking, not shadow */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 -bottom-2 h-8 rounded-b-4xl border border-border/40 bg-card/60"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-9 -bottom-3.5 h-8 rounded-b-4xl border border-border/30 bg-card/40"
      />

      <Link
        to="/dues"
        className="group relative block overflow-hidden rounded-4xl border border-border/70 bg-card transition-[border-color,transform] duration-200 hover:border-border active:translate-y-px"
      >
        {/* Top inner highlight — reads like a light-catch edge */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10"
        />

        <div className="p-5">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-muted to-muted/40 text-muted-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.6)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
                <HandCoins className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight text-foreground">
                  Dues
                </span>
                <span className="text-xs leading-tight text-muted-foreground">
                  {summary.activeCount} active
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {summary.overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-xs font-medium text-destructive shadow-[inset_0_1px_0_oklch(1_0_0/0.4)]">
                  <AlertTriangle className="size-3" />
                  {summary.overdueCount} overdue
                </span>
              )}
              <ChevronRight className="size-4 text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Receivable — emerald identity */}
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.07] to-emerald-500/[0.02] p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.6)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-[inset_0_1px_0_oklch(1_0_0/0.4)]">
                  <ArrowUpRight className="size-3" />
                </div>
                <span className="text-[0.7rem] font-medium uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
                  Receivable
                </span>
              </div>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(summary.owedToMe)}
              </span>
            </div>

            {/* Payable — amber identity */}
            <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.07] to-amber-500/[0.02] p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.6)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-[inset_0_1px_0_oklch(1_0_0/0.4)]">
                  <ArrowDownLeft className="size-3" />
                </div>
                <span className="text-[0.7rem] font-medium uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80">
                  Payable
                </span>
              </div>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(summary.iOwe)}
              </span>
            </div>
          </div>

          {/* Net — recessed row to read as a footer well */}
          {summary.net !== 0 && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/50 bg-muted/40 px-4 py-2.5 shadow-[inset_0_1px_2px_oklch(0_0_0/0.04)] dark:shadow-[inset_0_1px_2px_oklch(0_0_0/0.3)]">
              <span
                className="text-sm text-muted-foreground"
                title="Owed to you minus what you owe"
              >
                Net position
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  summary.net > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {summary.net > 0 ? "+" : ""}
                {formatCurrency(summary.net)}
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
