import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import { DEFAULT_CURRENCY } from "@ledg/shared";
import { motion } from "framer-motion";

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
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";

export default function DashboardPage() {
  const analytics = useAnalytics();
  const { openCreate, openEdit } = useTransactionForm();
  const currency = DEFAULT_CURRENCY;

  const recent = analytics.transactions
    .slice()
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5);

  const maxCategory = analytics.byCategory[0]?.amount ?? 0;

  return (
    <FadeInStagger className="flex flex-col gap-6">
      <Header />

      <FadeInItem>
        <section className="-mx-5 rounded-b-[2.5rem] bg-gradient-to-br from-primary via-primary to-[oklch(0.52_0.15_158)] px-5 pb-7 pt-2 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
              Total Balance
            </p>
            <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase text-primary-foreground/90 backdrop-blur-md">
              Active
            </span>
          </div>

          {analytics.loading ? (
            <Skeleton className="mt-2 h-12 w-48 bg-primary-foreground/20" />
          ) : (
            <p className="mt-1.5 text-4xl font-black tracking-tight tabular-nums">
              {formatCurrency(analytics.totalBalance, currency)}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-3xl bg-primary-foreground/12 p-3.5 backdrop-blur-md transition-all hover:bg-primary-foreground/15"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/85">
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-400/25 text-emerald-200">
                  <ArrowDownLeft className="size-3.5" />
                </span>
                Income
              </div>
              <p className="mt-2 text-lg font-extrabold tabular-nums">
                {formatCompact(analytics.monthIncome, currency)}
              </p>
              <p className="text-[0.65rem] font-medium text-primary-foreground/70">
                this month
              </p>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-3xl bg-primary-foreground/12 p-3.5 backdrop-blur-md transition-all hover:bg-primary-foreground/15"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/85">
                <span className="flex size-6 items-center justify-center rounded-full bg-rose-400/25 text-rose-200">
                  <ArrowUpRight className="size-3.5" />
                </span>
                Spent
              </div>
              <p className="mt-2 text-lg font-extrabold tabular-nums">
                {formatCompact(analytics.monthSpend, currency)}
              </p>
              <p className="text-[0.65rem] font-medium text-primary-foreground/70">
                this month
              </p>
            </motion.div>
          </div>
        </section>
      </FadeInItem>

      {!analytics.loading && analytics.transactions.length === 0 ? (
        <FadeInItem>
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
        </FadeInItem>
      ) : null}

      {analytics.byCategory.length > 0 ? (
        <FadeInItem>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Top categories
            </h2>

            <Card className="flex flex-col gap-3 p-4">
              {analytics.byCategory.slice(0, 4).map((c) => {
                const meta = getCategoryMeta(c.category);
                const percent =
                  maxCategory > 0 ? Math.round((c.amount / maxCategory) * 100) : 0;

                return (
                  <div key={c.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-2 text-foreground">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.name}
                      </span>
                      <span className="tabular-nums font-semibold">
                        {formatCurrency(c.amount, currency)}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        </FadeInItem>
      ) : null}

      <FadeInItem>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent activity
            </h2>
            <Link
              to="/transactions"
              className="text-sm font-medium text-primary hover:underline"
            >
              See all
            </Link>
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
                  onClick={() => openEdit(t, t.spaceId)}
                />
              ))}
            </div>
          )}
        </section>
      </FadeInItem>

      <FadeInItem>
        <section className="flex items-center gap-3 rounded-4xl bg-accent/50 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <TrendingUp className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              Smart Insight
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {analytics.monthSpend > 0
                ? `You spent ${formatCompact(analytics.monthSpend, currency)} this month across ${analytics.byCategory.length} categories.`
                : "No expenses recorded this month yet."}
            </p>
          </div>
        </section>
      </FadeInItem>
    </FadeInStagger>
  );
}
