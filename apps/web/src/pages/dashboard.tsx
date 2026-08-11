import { useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import { DEFAULT_CURRENCY } from "@ledg/shared";

import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionItem } from "@/components/transactions/transaction-item";
import { Button } from "@/components/ui/button";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency, formatCompact } from "@/lib/format";
import { useAnalytics } from "@/lib/analytics";
import { useTransactionForm } from "@/lib/transaction-form";

export default function DashboardPage() {
  const analytics = useAnalytics();
  const navigate = useNavigate();
  const { openCreate } = useTransactionForm();
  const currency = DEFAULT_CURRENCY;

  const recent = analytics.transactions
    .slice()
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5);

  const maxCategory = analytics.byCategory[0]?.amount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <section className="-mx-5 rounded-b-4xl bg-linear-to-br from-primary via-primary to-[oklch(0.5_0.15_158)] px-5 pb-8 pt-2 text-primary-foreground">
        <p className="text-sm font-medium text-primary-foreground/80">
          Total balance
        </p>
        {analytics.loading ? (
          <Skeleton className="mt-2 h-12 w-48 bg-primary-foreground/20" />
        ) : (
          <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
            {formatCurrency(analytics.totalBalance, currency)}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/80">
              <ArrowDownLeft className="size-3.5" />
              Income
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {formatCompact(analytics.monthIncome, currency)}
            </p>
            <p className="text-[0.65rem] text-primary-foreground/70">
              this month
            </p>
          </div>
          <div className="rounded-3xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/80">
              <ArrowUpRight className="size-3.5" />
              Spent
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {formatCompact(analytics.monthSpend, currency)}
            </p>
            <p className="text-[0.65rem] text-primary-foreground/70">
              this month
            </p>
          </div>
        </div>
      </section>

      {!analytics.loading && analytics.transactions.length === 0 ? (
        <Card className="border-none bg-card">
          <EmptyState
            title="Nothing tracked yet"
            description="Add your first transaction to start understanding your spending."
            action={
              <Button onClick={() => openCreate()}>
                Add your first transaction
              </Button>
            }
          />
        </Card>
      ) : null}

      {analytics.byCategory.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top categories
          </h2>
          <Card className="flex flex-col gap-4">
            {analytics.byCategory.slice(0, 5).map(({ category, amount }) => {
              const meta = getCategoryMeta(category);
              const Icon = meta.icon;
              const pct = maxCategory ? (amount / maxCategory) * 100 : 0;
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
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{category}</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(amount, currency)}
                      </p>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent activity
          </h2>
          <button
            type="button"
            onClick={() => navigate("/transactions")}
            className="text-sm font-medium text-primary"
          >
            See all
          </button>
        </div>

        {analytics.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-3xl" />
            ))}
          </div>
        ) : recent.length === 0 ? null : (
          <div className="flex flex-col gap-2">
            {recent.map((t) => (
              <TransactionItem
                key={t.id}
                transaction={t}
                currency={currency}
                onClick={() => openCreate()}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex items-center gap-3 rounded-4xl bg-accent/50 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <TrendingUp className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Smart insights</p>
          <p className="text-xs text-muted-foreground">
            Your top category this month is{" "}
            <span className="font-medium text-foreground">
              {analytics.byCategory[0]?.category ?? "—"}
            </span>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
