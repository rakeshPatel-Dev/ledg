import { useState, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Calendar as CalendarIcon, PieChart, TrendingDown, TrendingUp } from "lucide-react";
import { DEFAULT_CURRENCY } from "@ledg/shared";
import { motion, AnimatePresence } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { DatePicker } from "@/components/ui/date-picker";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { useSpaces, useAnalyticsSummary, useAnalyticsRecurring, useAllData } from "@/lib/queries";
import type { AnalyticsPeriod } from "@/lib/api";
import { InsightsCard } from "@/components/analytics/insights-card";
import { CategoryDrilldownSheet } from "@/components/analytics/category-drilldown-sheet";
import { RecurringCard } from "@/components/analytics/recurring-card";
import { cn } from "@/lib/utils";

// ─── Period selector options ──────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "month", label: "Month" },
  { value: "3months", label: "3M" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
];

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta, inverse = false }: { delta: number | null; inverse?: boolean }) {
  if (delta === null) return null;
  const isPositive = inverse ? delta < 0 : delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        isPositive
          ? "bg-success/15 text-success"
          : "bg-destructive/15 text-destructive"
      )}
    >
      <Icon className="size-2.5" />
      {Math.abs(delta)}%
    </span>
  );
}

// ─── Savings goal ring ────────────────────────────────────────────────────────

function SavingsRing({ income, expense }: { income: number; expense: number }) {
  const savings = Math.max(0, income - expense);
  const savingsRate = income > 0 ? Math.min(savings / income, 1) : 0;
  const circumference = 213.6; // 2π * 34
  const spendingArc = ((income - savings) / (income || 1)) * circumference;

  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" className="stroke-muted/30" />
        <circle
          cx="40" cy="40" r="34" fill="none" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${spendingArc} ${circumference}`}
          className="stroke-destructive transition-all duration-1000"
        />
        <circle
          cx="40" cy="40" r="34" fill="none" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${circumference - spendingArc} ${circumference}`}
          strokeDashoffset={-spendingArc}
          className="stroke-success transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-muted-foreground">
          {Math.round(savingsRate * 100)}%
        </span>
      </div>
    </div>
  );
}

function getPeriodDisplayLabel(period: AnalyticsPeriod, dateFrom?: string, dateTo?: string) {
  if (period === "today") return "today";
  if (period === "month") return "this month";
  if (period === "3months") return "last 3 months";
  if (period === "year") return "this year";
  if (period === "all") return "all time";
  if (period === "custom") {
    if (dateFrom && dateTo && dateFrom === dateTo) {
      return `on ${dateFrom}`;
    }
    if (dateFrom && dateTo) {
      return `from ${dateFrom} to ${dateTo}`;
    }
    return "custom period";
  }
  return "selected period";
}

function getPeriodComparisonLabel(period: AnalyticsPeriod) {
  if (period === "today") return "vs yesterday";
  if (period === "month") return "vs last month";
  if (period === "3months") return "vs previous 3 months";
  if (period === "year") return "vs last year";
  return "vs previous period";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const currency = DEFAULT_CURRENCY;
  const todayStr = new Date().toISOString().slice(0, 10);

  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState<string>(todayStr);
  const [customTo, setCustomTo] = useState<string>(todayStr);
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  // Spaces
  const spacesQuery = useSpaces();
  const spaces = spacesQuery.data ?? [];

  // Server-computed analytics data (supports "all" or specific spaceId)
  const summaryQ = useAnalyticsSummary(
    selectedSpaceId,
    period,
    period === "custom" ? customFrom : undefined,
    period === "custom" ? customTo : undefined
  );
  const recurringQ = useAnalyticsRecurring(selectedSpaceId);

  // Raw transactions (needed for drill-down sheet)
  const { transactions } = useAllData();

  const isLoading = spacesQuery.isLoading || summaryQ.isLoading;
  const summary = summaryQ.data;
  const recurring = recurringQ.data ?? [];

  // Filter transactions according to selected period and space for category drilldown sheet
  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (selectedSpaceId !== "all") {
      list = list.filter((t) => t.spaceId === selectedSpaceId);
    }
    if (!list.length) return [];
    const now = new Date();

    if (period === "today") {
      const todayDate = todayStr;
      return list.filter((t) => t.date?.slice(0, 10) === todayDate);
    }
    if (period === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      if (from) from.setHours(0, 0, 0, 0);
      const to = customTo ? new Date(customTo) : from;
      if (to) to.setHours(23, 59, 59, 999);

      return list.filter((t) => {
        const d = new Date(t.date);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    if (period === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return list.filter((t) => new Date(t.date) >= monthStart);
    }
    if (period === "3months") {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return list.filter((t) => new Date(t.date) >= threeMonthsAgo);
    }
    if (period === "year") {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return list.filter((t) => new Date(t.date) >= yearStart);
    }
    return list;
  }, [transactions, selectedSpaceId, period, customFrom, customTo, todayStr]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-4xl" />
        <Skeleton className="h-48 w-full rounded-4xl" />
      </div>
    );
  }

  const totalIncome = summary?.current.totalIncome ?? 0;
  const totalExpense = summary?.current.totalExpense ?? 0;
  const transactionCount = summary?.current.transactionCount ?? 0;
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

  const displayPeriod = getPeriodDisplayLabel(period, customFrom, customTo);
  const compLabel = getPeriodComparisonLabel(period);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Financial analytics & spending breakdown
          </p>
        </div>
      </div>

      {/* ── Space selector (if user has spaces) ── */}
      {spaces.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedSpaceId("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
              selectedSpaceId === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            All spaces
          </button>
          {spaces.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSpaceId(s.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                selectedSpaceId === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Period Selector ── */}
      <Segmented
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
      />

      {/* ── Custom Date Range Filter ── */}
      <AnimatePresence>
        {period === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-20"
          >
            <Card className="rounded-3xl p-4 bg-muted/40 border-border/60 overflow-visible">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <CalendarIcon className="size-3.5" />
                Custom Date Filter
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    From Date
                  </label>
                  <DatePicker
                    value={customFrom}
                    onChange={(val) => {
                      setCustomFrom(val);
                      if (val > customTo) setCustomTo(val);
                    }}
                    placeholder="Start date"
                    side="bottom"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    To Date
                  </label>
                  <DatePicker
                    value={customTo}
                    onChange={(val) => {
                      setCustomTo(val);
                      if (val < customFrom) setCustomFrom(val);
                    }}
                    placeholder="End date"
                    side="bottom"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                <span>
                  {customFrom === customTo
                    ? "Viewing single day"
                    : "Viewing date range"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomFrom(todayStr);
                    setCustomTo(todayStr);
                  }}
                  className="font-medium text-primary hover:underline text-xs"
                >
                  Reset to today
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state for no transactions in selected period ── */}
      {transactionCount === 0 ? (
        <Card className="border-none bg-card p-6">
          <EmptyState
            icon={<PieChart className="size-7" />}
            title="No data for this period"
            description={`No transactions found ${displayPeriod}. Try selecting a different period or add new transactions.`}
          />
        </Card>
      ) : (
        <>
          {/* ── Income / Expense cards ── */}
          <section className="grid grid-cols-2 gap-3">
            <Card className="flex flex-col gap-2 rounded-4xl p-5">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-success/15 text-success">
                <ArrowDownLeft className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatCurrency(totalIncome, currency)}
                </p>
                {summary?.deltas.income !== null && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <DeltaBadge delta={summary?.deltas.income ?? null} />
                    <span className="text-[10px] text-muted-foreground">{compLabel}</span>
                  </div>
                )}
              </div>
            </Card>
            <Card className="flex flex-col gap-2 rounded-4xl p-5">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <ArrowUpRight className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatCurrency(totalExpense, currency)}
                </p>
                {summary?.deltas.expense !== null && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <DeltaBadge delta={summary?.deltas.expense ?? null} inverse />
                    <span className="text-[10px] text-muted-foreground">{compLabel}</span>
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* ── Savings rate ring ── */}
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
                  of income saved {displayPeriod}
                </p>
              </div>
              <SavingsRing income={totalIncome} expense={totalExpense} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 border-t border-border/40 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-success" />
                <span className="text-[10px] text-muted-foreground">
                  Saved {formatCurrency(Math.max(0, totalIncome - totalExpense), currency)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-destructive" />
                <span className="text-[10px] text-muted-foreground">
                  Spent {formatCurrency(totalExpense, currency)}
                </span>
              </div>
            </div>
          </Card>

          {/* ── Quick Insights ── */}
          {summary && summary.insights.length > 0 && (
            <InsightsCard insights={summary.insights} />
          )}

          {/* ── Expense by Category (clickable drill-down) ── */}
          {(summary?.byExpenseCategory.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Spending by category
              </h2>
              <Card className="flex flex-col gap-4 p-5">
                {summary!.byExpenseCategory.map(({ category, amount, count }) => {
                  const meta = getCategoryMeta(category);
                  const Icon = meta.icon;
                  const percentage =
                    totalExpense > 0 ? (amount / totalExpense) * 100 : 0;

                  return (
                    <motion.button
                      key={category}
                      whileTap={{ scale: 0.98 }}
                      className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
                      onClick={() => setDrillCategory(category)}
                    >
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
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(percentage, 100)}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              style={{ backgroundColor: meta.color }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {count} transaction{count === 1 ? "" : "s"} · tap to explore
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </Card>
            </section>
          )}

          {/* ── Income by Category ── */}
          {(summary?.byIncomeCategory.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Income by category
              </h2>
              <Card className="flex flex-col gap-4 p-5">
                {summary!.byIncomeCategory.map(({ category, amount, count }) => {
                  const meta = getCategoryMeta(category);
                  const Icon = meta.icon;
                  const percentage =
                    totalIncome > 0 ? (amount / totalIncome) * 100 : 0;

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
          )}

          {/* ── Recurring Transactions ── */}
          {!recurringQ.isLoading && <RecurringCard groups={recurring} />}
        </>
      )}

      {/* ── Category drill-down sheet (using period-filtered transactions) ── */}
      <CategoryDrilldownSheet
        open={!!drillCategory}
        onOpenChange={(open) => { if (!open) setDrillCategory(null); }}
        category={drillCategory}
        transactions={filteredTransactions}
      />
    </div>
  );
}