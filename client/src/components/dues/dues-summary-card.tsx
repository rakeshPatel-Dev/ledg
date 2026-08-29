import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  HandCoins,
} from "lucide-react";

import { useDuesSummary } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DuesSummaryCardProps {
  className?: string;
}

export function DuesSummaryCard({ className }: DuesSummaryCardProps) {
  const { data: summary, isLoading } = useDuesSummary();

  if (isLoading || !summary) return null;

  const hasDues = summary.activeCount > 0 || summary.owedToMe > 0 || summary.iOwe > 0;
  if (!hasDues) return null;

  return (
    <Link
      to="/dues"
      className={cn(
        "group relative flex flex-col gap-0 overflow-hidden rounded-4xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        className
      )}
    >
      {/* Colored top strip */}
      {/* <div className={cn(
        "h-1 w-full",
        isNetPositive ? "bg-linear-to-r from-emerald-500 to-teal-500" : "bg-linear-to-r from-amber-500 to-orange-500"
      )} /> */}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-4xl bg-primary/10 text-primary">
              <HandCoins className="size-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Dues
              </span>
              <p className="text-[0.6rem] text-muted-foreground leading-tight">
                {summary.activeCount} active due{summary.activeCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {summary.overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 border border-destructive/20 px-2 py-0.5 text-[0.58rem] font-bold text-destructive">
                <AlertTriangle className="size-2.5" />
                {summary.overdueCount} overdue
              </span>
            )}
            <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-3xl bg-emerald-500/8 border border-emerald-500/15 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15">
                <ArrowUpRight className="size-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {/* This is the amount you are going to be paid back */}
                Receivable
              </span>
            </div>
            <span className="text-base font-black tabular-nums text-foreground">
              {formatCurrency(summary.owedToMe)}
            </span>
          </div>

          <div className="rounded-3xl bg-amber-500/8 border border-amber-500/15 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="flex size-5 items-center justify-center rounded-full bg-amber-500/15">
                <ArrowDownLeft className="size-3 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {/* This is the amount you are going to pay */}
                Payable
              </span>
            </div>
            <span className="text-base font-black tabular-nums text-foreground">
              {formatCurrency(summary.iOwe)}
            </span>
          </div>
        </div>

        {/* Net */}
        {summary.net !== 0 && (
          <div className="flex items-center justify-between rounded-4xl bg-muted/50 border border-border/30 px-3 py-2">
            <span className="text-[0.65rem] font-semibold text-muted-foreground">Net position</span>
            <span
              className={cn(
                "text-sm font-black tabular-nums",
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
  );
}
