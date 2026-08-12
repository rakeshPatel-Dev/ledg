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

  // Calculate savings rate correctly
  const savingsRate =
    analytics.monthIncome > 0
      ? Math.max(
          0,
          ((analytics.monthIncome - analytics.monthSpend) / analytics.monthIncome) * 100
        )
      : 0;

  // Calculate the ratio for the chart (savings vs spending)
  const chartRatio = analytics.monthIncome > 0
    ? Math.min((analytics.monthSpend / analytics.monthIncome), 1)
    : 0;

  // Circumference = 2 * PI * r = 2 * 3.14159 * 34 = 213.6
  const circumference = 213.6;
  const strokeDasharray = chartRatio * circumference;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Insights</h1>

      <section className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-2 rounded-4xl p-5">
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
        <Card className="flex flex-col gap-2 rounded-4xl p-5">
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

      <Card className="rounded-4xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Savings rate
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {Math.round(savingsRate)}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of monthly income saved
            </p>
          </div>
          <div className="relative size-20">
            <svg viewBox="0 0 80 80" className="size-full -rotate-90">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="8"
                className="stroke-muted/30"
              />
              {/* Spending portion (red) */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                className="stroke-destructive transition-all duration-1000"
              />
              {/* Savings portion (green) */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${circumference - strokeDasharray} ${circumference}`}
                strokeDashoffset={-strokeDasharray}
                className="stroke-success transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground">
                {Math.round((1 - chartRatio) * 100)}%
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 pt-3 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-success" />
            <span className="text-[10px] text-muted-foreground">
              Saved {formatCurrency(analytics.monthIncome - analytics.monthSpend, currency)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive" />
            <span className="text-[10px] text-muted-foreground">
              Spent {formatCurrency(analytics.monthSpend, currency)}
            </span>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Spending by category
        </h2>
        <Card className="flex flex-col gap-4 p-5">
          {analytics.byCategory.map(({ category, amount, count }) => {
            const meta = getCategoryMeta(category);
            const Icon = meta.icon;
            const percentage = analytics.totalExpense > 0 
              ? (amount / analytics.totalExpense) * 100 
              : 0;

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
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium truncate">{category}</p>
                    <p className="text-sm font-semibold tabular-nums shrink-0">
                      {formatCurrency(amount, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {count} transaction{count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Income by category
        </h2>
        {analytics.byIncomeCategory.length === 0 ? (
          <EmptyState
            title="No income tracked"
            description="Add some income and your income sources will show up here."
          />
        ) : (
          <Card className="flex flex-col gap-4 p-5">
            {analytics.byIncomeCategory.map(({ category, amount, count }) => {
              const meta = getCategoryMeta(category);
              const Icon = meta.icon;
              const percentage = analytics.totalIncome > 0 
                ? (amount / analytics.totalIncome) * 100 
                : 0;

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
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium truncate">{category}</p>
                      <p className="text-sm font-semibold tabular-nums shrink-0">
                        {formatCurrency(amount, currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: meta.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count} transaction{count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}