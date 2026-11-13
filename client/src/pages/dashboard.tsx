import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  Smartphone,
  Plus,
  ReceiptText,
} from "lucide-react";
import { DEFAULT_CURRENCY, PAYMENT_LABELS, type Transaction } from "@ledg/shared";
import { motion } from "framer-motion";

import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SwipeableTransactionItem } from "@/components/transactions/swipeable-transaction-item";
import { DeleteTransactionSheet } from "@/components/transactions/delete-transaction-sheet";
import { DuesSummaryCard } from "@/components/dues/dues-summary-card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Segmented } from "@/components/ui/segmented";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency, formatCompact } from "@/lib/format";
import { useDashboardSummary } from "@/lib/queries";
import { useTransactionForm } from "@/lib/transaction-form";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";
import { cn } from "@/lib/utils";

type CategoryTab = "expense" | "income";

const CATEGORY_TABS: { value: CategoryTab; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

export default function DashboardPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useDashboardSummary();
  const { openCreate, openEdit } = useTransactionForm();
  const currency = DEFAULT_CURRENCY;
  const [tab, setTab] = useState<CategoryTab>("expense");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const recent = data?.recentTransactions ?? [];
  const byCategory = data?.byCategory ?? [];
  const byIncomeCategory = data?.byIncomeCategory ?? [];
  const byPaymentMethod = data?.byPaymentMethod ?? [];

  const activeCategories = tab === "expense" ? byCategory : byIncomeCategory;
  const maxCategory = activeCategories[0]?.amount ?? 0;

  const activePaymentTotal = byPaymentMethod.reduce((sum, item) => sum + item.amount, 0);

  const getPaymentIcon = (method: string) => {
    const methodLower = method.toLowerCase();
    if (methodLower.includes("card") || methodLower.includes("credit")) {
      return CreditCard;
    }
    if (methodLower.includes("bank") || methodLower.includes("transfer")) {
      return Landmark;
    }
    if (
      methodLower.includes("upi") ||
      methodLower.includes("phone") ||
      methodLower.includes("mobile")
    ) {
      return Smartphone;
    }
    return WalletIcon;
  };

  const isAllEmpty =
    !isPending &&
    !isError &&
    ((data?.transactionCount ?? 0) === 0 ||
      (recent.length === 0 && byCategory.length === 0 && byIncomeCategory.length === 0));

  return (
    <FadeInStagger className="flex flex-col gap-6">
      <h1 className="sr-only">Home</h1>
      <Header />

      {isError ? (
        <FadeInItem>
          <ErrorState
            title="Couldn't load your summary"
            description="Your totals are hidden until the request succeeds, so nothing here looks like a real balance."
            error={error}
            onRetry={refetch}
            isRetrying={isFetching}
          />
        </FadeInItem>
      ) : (
        <FadeInItem>
          <section
            className={cn(
              "relative -mx-5 overflow-hidden rounded-b-4xl px-5 pb-6 pt-2 text-primary-foreground",
              // Near-solid base + soft brand wash from the top-right
              "bg-[oklch(0.52_0.13_158)]",
              "bg-[radial-gradient(120%_140%_at_100%_0%,oklch(0.58_0.15_155)_0%,oklch(0.52_0.13_158)_45%,oklch(0.47_0.12_158)_100%)]",
              "shadow-[inset_0_1px_0_oklch(1_0_0/0.14)]",
              "dark:bg-[oklch(0.26_0.07_158)]",
              "dark:bg-[radial-gradient(120%_140%_at_100%_0%,oklch(0.31_0.09_155)_0%,oklch(0.26_0.07_158)_45%,oklch(0.22_0.06_158)_100%)]",
              "dark:text-emerald-50"
            )}
          >
            {/* Soft top light-catch, no glow */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent dark:via-white/12"
            />

            <div className="relative flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/80 dark:text-emerald-100/80">
                Net saved
              </p>
              <span
                className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-medium text-primary-foreground/80 dark:bg-white/10 dark:text-emerald-100/80"
                title="Loan principal and settlements are tracked separately"
              >
                Excl. loans
              </span>
            </div>

            {isPending ? (
              <Skeleton className="mt-3 h-11 w-48 bg-black/10 dark:bg-white/10" />
            ) : (
              <>
                <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
                  {data ? formatCurrency(data.totalBalance, currency) : "—"}
                </p>
                <p className="mt-1 text-xs text-primary-foreground/70 dark:text-emerald-100/70">
                  All-time income minus spending
                </p>
              </>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-white/12 bg-black/10 p-4 dark:border-white/8 dark:bg-white/8">
                <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/90 dark:text-emerald-50/90">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/12 text-primary-foreground dark:bg-white/15 dark:text-emerald-50">
                    <ArrowDownLeft className="size-3.5" />
                  </span>
                  Income
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {data ? formatCompact(data.monthIncome, currency) : "—"}
                </p>
                <p className="text-xs text-primary-foreground/70 dark:text-emerald-100/70">
                  this month
                </p>
              </div>
              <div className="rounded-3xl border border-white/12 bg-black/10 p-4 dark:border-white/8 dark:bg-white/8">
                <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/90 dark:text-emerald-50/90">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/12 text-primary-foreground dark:bg-white/15 dark:text-emerald-50">
                    <ArrowUpRight className="size-3.5" />
                  </span>
                  Spent
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {data ? formatCompact(data.monthSpend, currency) : "—"}
                </p>
                <p className="text-xs text-primary-foreground/70 dark:text-emerald-100/70">
                  this month
                </p>
              </div>
            </div>
          </section>
        </FadeInItem>
      )}

      <FadeInItem>
        <DuesSummaryCard />
      </FadeInItem>

      {isPending ? (
        <FadeInItem>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-4xl" />
            <Skeleton className="h-40 w-full rounded-4xl" />
          </div>
        </FadeInItem>
      ) : null}

      {isAllEmpty ? (
        <FadeInItem>
          <Card className="rounded-4xl border border-border/60 p-2">
            <EmptyState
              icon={<ReceiptText className="size-7" />}
              title="Nothing tracked yet"
              description="Add your first transaction to start understanding your spending."
              action={
                <Button onClick={() => openCreate()} className="rounded-full">
                  <Plus className="mr-2 size-4" />
                  Add your first transaction
                </Button>
              }
            />
          </Card>
        </FadeInItem>
      ) : null}

      {(byCategory.length > 0 || byIncomeCategory.length > 0) && (
        <FadeInItem>
          <section>
            <Segmented
              options={CATEGORY_TABS}
              value={tab}
              onChange={setTab}
              className="mb-3"
            />

            {activeCategories.length > 0 ? (
              <Card className="flex flex-col gap-3 p-4">
                {activeCategories.slice(0, 4).map((c) => {
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
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(c.amount, currency)}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted shadow-elev-inset">
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
            ) : (
              <Card className="rounded-4xl border border-border/60 p-2">
                <EmptyState
                  icon={<ReceiptText className="size-7" />}
                  title={tab === "income" ? "No income tracked" : "No expenses tracked"}
                  description={
                    tab === "income"
                      ? "Add your first income to see it broken down here."
                      : "Add your first expense to see it broken down here."
                  }
                  action={
                    <Button
                      onClick={() => openCreate()}
                      variant="outline"
                      className="rounded-full"
                    >
                      <Plus className="mr-2 size-4" />
                      Add {tab}
                    </Button>
                  }
                />
              </Card>
            )}
          </section>
        </FadeInItem>
      )}

      {!isPending && byPaymentMethod.length > 0 && (
        <FadeInItem>
          <section>
            <SectionHeading
              title="Payment methods"
              icon={<CreditCard className="size-3" />}
            />

            <div className="grid grid-cols-2 gap-3">
              {byPaymentMethod.map((item) => {
                const Icon = getPaymentIcon(item.method);
                const percentage =
                  activePaymentTotal > 0
                    ? Math.round((item.amount / activePaymentTotal) * 100)
                    : 0;
                const displayName =
                  PAYMENT_LABELS[item.method as keyof typeof PAYMENT_LABELS] ||
                  item.method;

                return (
                  <Card
                    key={item.method}
                    className={cn(
                      "flex flex-col gap-2 rounded-4xl border-border/60 p-4",
                      "transition-colors hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-muted text-muted-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="truncate text-sm font-medium">
                          {displayName}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>

                    <div>
                      <p className="text-base font-semibold tabular-nums">
                        {formatCurrency(item.amount, currency)}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50 shadow-elev-inset">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        </FadeInItem>
      )}

      {(isPending || recent.length > 0) && (
        <FadeInItem>
          <section>
            <SectionHeading
              title="Recent activity"
              action={
                <Link
                  to="/transactions"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  See all
                </Link>
              }
            />

            {isPending ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-3xl" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recent.map((t) => (
                  <SwipeableTransactionItem
                    key={t.id}
                    transaction={t}
                    currency={currency}
                    onClick={() => openEdit(t, t.spaceId)}
                    onRequestDelete={() => setDeleteTarget(t)}
                  />
                ))}
              </div>
            )}
          </section>
        </FadeInItem>
      )}

      {!isPending && (data?.transactionCount ?? 0) > 0 && (
        <FadeInItem>
          <section className="flex items-center gap-3 rounded-4xl border border-border/60 bg-card p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted text-muted-foreground">
              <TrendingUp className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Smart insight</p>
              <p className="truncate text-xs text-muted-foreground">
                {(data?.monthSpend ?? 0) > 0
                  ? `You spent ${formatCompact(data?.monthSpend ?? 0, currency)} this month across ${byCategory.length} categories.`
                  : "No expenses recorded this month yet."}
              </p>
            </div>
          </section>
        </FadeInItem>
      )}

      <DeleteTransactionSheet
        transaction={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </FadeInStagger>
  );
}
