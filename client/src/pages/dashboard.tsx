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

  const getPaymentColor = (method: string) => {
    const methodLower = method.toLowerCase();
    if (methodLower.includes("card") || methodLower.includes("credit")) {
      return "bg-blue-500/10 text-blue-500";
    }
    if (methodLower.includes("bank") || methodLower.includes("transfer")) {
      return "bg-purple-500/10 text-purple-500";
    }
    if (
      methodLower.includes("upi") ||
      methodLower.includes("phone") ||
      methodLower.includes("mobile")
    ) {
      return "bg-emerald-500/10 text-emerald-500";
    }
    return "bg-amber-500/10 text-amber-500";
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
          <section className="relative -mx-5 overflow-hidden rounded-b-[2.5rem] bg-linear-to-br from-primary via-primary to-[oklch(0.44_0.14_158)] px-5 pb-7 pt-2 text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_18px_40px_-18px_color-mix(in_oklch,var(--primary)_50%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:hero-glow after:pointer-events-none after:absolute after:inset-0 after:ledger-lines after:opacity-45 dark:from-[oklch(0.30_0.075_158)] dark:via-[oklch(0.26_0.065_158)] dark:to-[oklch(0.22_0.055_158)] dark:text-emerald-50 dark:shadow-black/30">
            <div className="relative flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground dark:text-emerald-100">
                Net saved
              </p>
              <span
                className="rounded-full bg-black/15 px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase text-primary-foreground backdrop-blur-md dark:bg-white/10 dark:text-emerald-50"
                title="Loan principal and settlements are tracked separately"
              >
                Excl. loans
              </span>
            </div>

            {isPending ? (
              <Skeleton className="mt-2 h-12 w-48 bg-black/15 dark:bg-white/10" />
            ) : (
              <>
                <p className="mt-1.5 text-4xl font-black tracking-tight tabular-nums drop-shadow-[0_1px_0_oklch(0_0_0/0.18)]">
                  {data ? formatCurrency(data.totalBalance, currency) : "—"}
                </p>
                <p className="mt-1 text-[0.7rem] font-medium text-primary-foreground dark:text-emerald-100">
                  All-time income minus spending
                </p>
              </>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-3xl border border-white/15 bg-black/10 p-3.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.14)] transition-all hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground dark:text-emerald-50">
                  <span className="flex size-6 items-center justify-center rounded-full bg-emerald-950/25 text-emerald-50 dark:bg-emerald-400/20 dark:text-emerald-200">
                    <ArrowDownLeft className="size-3.5" />
                  </span>
                  Income
                </div>
                <p className="mt-2 text-lg font-extrabold tabular-nums">
                  {data ? formatCompact(data.monthIncome, currency) : "—"}
                </p>
                <p className="text-[0.65rem] font-medium text-primary-foreground dark:text-emerald-100">
                  this month
                </p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-3xl border border-white/15 bg-black/10 p-3.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.14)] transition-all hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground dark:text-emerald-50">
                  <span className="flex size-6 items-center justify-center rounded-full bg-rose-950/25 text-rose-50 dark:bg-rose-400/20 dark:text-rose-200">
                    <ArrowUpRight className="size-3.5" />
                  </span>
                  Spent
                </div>
                <p className="mt-2 text-lg font-extrabold tabular-nums">
                  {data ? formatCompact(data.monthSpend, currency) : "—"}
                </p>
                <p className="text-[0.65rem] font-medium text-primary-foreground dark:text-emerald-100">
                  this month
                </p>
              </motion.div>
            </div>
          </section>
        </FadeInItem>
      )}

      <FadeInItem>
        <DuesSummaryCard />
      </FadeInItem>

      {/* Loading Skeleton */}
      {isPending ? (
        <FadeInItem>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-4xl" />
            <Skeleton className="h-40 w-full rounded-4xl" />
          </div>
        </FadeInItem>
      ) : null}

      {/* Empty State Card */}
      {isAllEmpty ? (
        <FadeInItem>
          <Card className="rounded-4xl p-2 border border-border/60">
            <EmptyState
              icon={<ReceiptText className="size-7" />}
              title="Nothing tracked yet"
              description="Add your first transaction to start understanding your spending."
              action={
                <Button onClick={() => openCreate()} className="rounded-full">
                  <Plus className="size-4 mr-2" />
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
                        <span className="tabular-nums font-semibold">
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
              <Card className="rounded-4xl p-2 border border-border/60">
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
                      <Plus className="size-4 mr-2" />
                      Add {tab}
                    </Button>
                  }
                />
              </Card>
            )}
          </section>
        </FadeInItem>
      )}

      {/* Payment Methods Section */}
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
                const colorClass = getPaymentColor(item.method);
                const percentage =
                  activePaymentTotal > 0
                    ? Math.round((item.amount / activePaymentTotal) * 100)
                    : 0;
                const displayName =
                  PAYMENT_LABELS[item.method as keyof typeof PAYMENT_LABELS] ||
                  item.method;

                return (
                  <motion.div
                    key={item.method}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Card
                      variant="raised"
                      className={cn(
                        "flex flex-col gap-2 rounded-4xl p-4",
                        "border-border/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-9 items-center justify-center rounded-2xl ring-1 ring-black/5 ring-inset dark:ring-white/5",
                              colorClass
                            )}
                          >
                            <Icon className="size-4.5" />
                          </span>
                          <span className="text-sm font-medium truncate">
                            {displayName}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {percentage}%
                        </span>
                      </div>

                      <div>
                        <p className="text-base font-bold tabular-nums">
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
                  </motion.div>
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
          <section className="relative flex items-center gap-3 overflow-hidden rounded-4xl border border-primary/12 bg-accent/40 p-4 shadow-elev-card">
            <span className="absolute inset-y-4 left-0 w-0.5 rounded-r-full bg-primary/40" />
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/12 text-primary shadow-xs">
              <TrendingUp className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">Smart Insight</p>
              <p className="text-xs text-muted-foreground truncate">
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
