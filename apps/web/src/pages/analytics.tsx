import { ArrowDownLeft, ArrowUpRight, PieChart } from "lucide-react";
import { DEFAULT_CURRENCY } from "@ledg/shared";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { useAnalytics } from "@/lib/analytics";

export default function AnalyticsPage() {
  const analytics = useAnalytics();
  const currency = DEFAULT_CURRENCY;

  if (analytics.loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full rounded-4xl" />
        <Skeleton className="h-64 w-full rounded-4xl" />
      </div>
    );
  }

  if (analytics.transactions.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Insights</h1>
        <EmptyState
          icon={<PieChart className="size-7" />}
          title="No data to analyse yet"
          description="Add some transactions and your spending patterns will show up here."
        />
      </div>
    );
  }

  const incomeRatio = analytics.totalIncome + analytics.totalExpense > 0
    ? analytics.totalIncome / (analytics.totalIncome + analytics.totalExpense)
    : 0;

  const savingsRate =
    analytics.monthIncome > 0
      ? Math.max(
          0,
          ((analytics.monthIncome - analytics.monthSpend) / analytics.monthIncome) * 100
        )
      : 0;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Insights</h1>

      <section className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-2 rounded-4xl">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-success/15 text-success">
            <ArrowDownLeft className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Total income</p>
            <p className="text-lg font-bold tabular-nums">
              {formatCurrency(analytics.totalIncome, currency)}
            </p>
          </div>
        </Card>
        <Card className="flex flex-col gap-2 rounded-4xl">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <ArrowUpRight className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Total expenses</p>
            <p className="text-lg font-bold tabular-nums">
              {formatCurrency(analytics.totalExpense, currency)}
            </p>
          </div>
        </Card>
      </section>

      <Card className="rounded-4xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Savings rate</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {Math.round(savingsRate)}%
            </p>
          </div>
          <div className="relative size-20">
            <svg viewBox="0 0 80 80" className="size-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="10"
                className="stroke-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(incomeRatio * 213.6).toFixed(1)} 213.6`}
                className="stroke-primary"
              />
            </svg>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Income vs expense ratio across all your spaces.
        </p>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Spending by category
        </h2>
        <Card className="flex flex-col gap-4">
          {analytics.byCategory.map(({ category, amount, count }) => {
            const meta = getCategoryMeta(category);
            const Icon = meta.icon;
            return (
              <div key={category} className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${meta.color}1f`,
                    color: meta.color,
                  }}
                >
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">{category}</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(amount, currency)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {count} transaction{count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
