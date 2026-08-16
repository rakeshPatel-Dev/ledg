import type { Types } from "mongoose";

import * as spaceRepository from "../spaces/repository.js";
import * as analyticsRepository from "./repository.js";
import { NotFoundError } from "../../common/errors/index.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveSpace(spaceId: string, ownerId: Types.ObjectId) {
  const space = await spaceRepository.findSpaceById(spaceId, ownerId);
  if (!space) throw new NotFoundError("Space");
  return space._id;
}

type Period = "today" | "month" | "3months" | "year" | "all" | "custom";

interface DateRangeOptions {
  dateFrom?: string;
  dateTo?: string;
}

function dateRangeForPeriod(
  period: Period,
  options?: DateRangeOptions
): { from?: Date; to?: Date } {
  const now = new Date();
  if (period === "all") return {};

  if (period === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (period === "custom") {
    if (!options?.dateFrom && !options?.dateTo) {
      // Default to today if custom dates not specified yet
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    const from = options?.dateFrom ? new Date(options.dateFrom) : undefined;
    if (from) from.setHours(0, 0, 0, 0);

    const to = options?.dateTo ? new Date(options.dateTo) : options?.dateFrom ? new Date(options.dateFrom) : undefined;
    if (to) to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  const from = new Date();
  if (period === "month") {
    from.setMonth(now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "3months") {
    from.setMonth(now.getMonth() - 2, 1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }
  return { from };
}

function prevDateRangeForPeriod(
  period: Period,
  options?: DateRangeOptions
): { from?: Date; to?: Date } {
  if (period === "all") return {};

  const currentRange = dateRangeForPeriod(period, options);
  if (!currentRange.from) return {};

  if (period === "today") {
    const now = new Date();
    const prevFrom = new Date(now);
    prevFrom.setDate(prevFrom.getDate() - 1);
    prevFrom.setHours(0, 0, 0, 0);
    const prevTo = new Date(now);
    prevTo.setDate(prevTo.getDate() - 1);
    prevTo.setHours(23, 59, 59, 999);
    return { from: prevFrom, to: prevTo };
  }

  if (period === "custom" && currentRange.from && currentRange.to) {
    const duration = currentRange.to.getTime() - currentRange.from.getTime();
    const prevTo = new Date(currentRange.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - duration);
    return { from: prevFrom, to: prevTo };
  }

  const prevTo = new Date(currentRange.from.getTime() - 1);
  const prevFrom = new Date(prevTo);

  if (period === "month") {
    prevFrom.setMonth(prevTo.getMonth(), 1);
    prevFrom.setHours(0, 0, 0, 0);
  } else if (period === "3months") {
    prevFrom.setMonth(prevTo.getMonth() - 2, 1);
    prevFrom.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    prevFrom.setFullYear(prevTo.getFullYear(), 0, 1);
    prevFrom.setHours(0, 0, 0, 0);
  }

  return { from: prevFrom, to: prevTo };
}

// ─── Generate Quick Insights ──────────────────────────────────────────────────

function getPeriodLabel(period: Period) {
  if (period === "today") return "yesterday";
  if (period === "month") return "last month";
  if (period === "3months") return "previous 3 months";
  if (period === "year") return "last year";
  return "previous period";
}

function buildInsights(
  current: { totalIncome: number; totalExpense: number },
  previous: { totalIncome: number; totalExpense: number },
  currentCategories: { category: string; amount: number }[],
  prevCategories: { category: string; amount: number }[],
  period: Period
): string[] {
  const insights: string[] = [];
  const periodLabel = getPeriodLabel(period);

  // Overall spend change
  if (previous.totalExpense > 0 && current.totalExpense > 0) {
    const changePct = Math.round(
      ((current.totalExpense - previous.totalExpense) / previous.totalExpense) *
        100
    );
    if (Math.abs(changePct) >= 5) {
      insights.push(
        changePct > 0
          ? `You spent ${changePct}% more than ${periodLabel}`
          : `You spent ${Math.abs(changePct)}% less than ${periodLabel} — great job!`
      );
    }
  }

  // Savings rate
  if (current.totalIncome > 0) {
    const savings = current.totalIncome - current.totalExpense;
    const savingsRate = Math.round((savings / current.totalIncome) * 100);
    if (savingsRate > 0) {
      insights.push(`You're saving ${savingsRate}% of your income this period`);
    } else if (savingsRate < 0) {
      insights.push(
        `You're spending more than you earn — consider reviewing your budget`
      );
    }
  }

  // Top category vs last period
  if (currentCategories.length > 0 && prevCategories.length > 0) {
    const topCurrent = currentCategories[0];
    const prevMatch = prevCategories.find(
      (p) => p.category === topCurrent.category
    );
    if (prevMatch && prevMatch.amount > 0) {
      const pct = Math.round(
        ((topCurrent.amount - prevMatch.amount) / prevMatch.amount) * 100
      );
      if (Math.abs(pct) >= 10) {
        insights.push(
          pct > 0
            ? `${topCurrent.category} spending is up ${pct}% vs ${periodLabel}`
            : `${topCurrent.category} spending dropped ${Math.abs(pct)}% vs ${periodLabel}`
        );
      }
    }
  }

  // Deficit alert
  if (current.totalExpense > current.totalIncome && current.totalIncome > 0) {
    const deficit = current.totalExpense - current.totalIncome;
    insights.push(
      `You're over budget by ${deficit.toFixed(2)} — try to cut back`
    );
  }

  return insights.slice(0, 5);
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getAnalyticsSummary(
  ownerId: Types.ObjectId,
  spaceId: string,
  period: Period = "month",
  options?: DateRangeOptions
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const range = dateRangeForPeriod(period, options);
  const prevRange = prevDateRangeForPeriod(period, options);

  const [current, previous, currentExpCats, prevExpCats, currentIncCats] =
    await Promise.all([
      analyticsRepository.getSpaceSummary(resolvedSpaceId, range),
      analyticsRepository.getSpaceSummary(resolvedSpaceId, prevRange),
      analyticsRepository.getCategoryBreakdown(resolvedSpaceId, "expense", range),
      analyticsRepository.getCategoryBreakdown(resolvedSpaceId, "expense", prevRange),
      analyticsRepository.getCategoryBreakdown(resolvedSpaceId, "income", range),
    ]);

  const insights = buildInsights(
    current,
    previous,
    currentExpCats,
    prevExpCats,
    period
  );

  // Month-over-month or period-over-period deltas
  const expenseDelta =
    previous.totalExpense > 0
      ? Math.round(
          ((current.totalExpense - previous.totalExpense) /
            previous.totalExpense) *
            100
        )
      : null;

  const incomeDelta =
    previous.totalIncome > 0
      ? Math.round(
          ((current.totalIncome - previous.totalIncome) /
            previous.totalIncome) *
            100
        )
      : null;

  return {
    period,
    current: {
      totalIncome: current.totalIncome,
      totalExpense: current.totalExpense,
      balance: current.totalIncome - current.totalExpense,
      transactionCount: current.count,
    },
    previous: {
      totalIncome: previous.totalIncome,
      totalExpense: previous.totalExpense,
    },
    deltas: {
      expense: expenseDelta,
      income: incomeDelta,
    },
    byExpenseCategory: currentExpCats,
    byIncomeCategory: currentIncCats,
    insights,
  };
}

export async function getAnalyticsTrends(
  ownerId: Types.ObjectId,
  spaceId: string,
  period: Period = "month",
  options?: DateRangeOptions
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const range = dateRangeForPeriod(period, options);

  // For "year" or "all" use monthly grouping; otherwise daily
  if (period === "year" || period === "all") {
    const months = period === "year" ? 12 : 24;
    const monthly = await analyticsRepository.getMonthlyTrend(
      resolvedSpaceId,
      months
    );
    return {
      granularity: "monthly" as const,
      data: monthly.map((m) => ({
        date: `${m.year}-${String(m.month).padStart(2, "0")}`,
        income: m.income,
        expense: m.expense,
      })),
    };
  }

  const daily = await analyticsRepository.getDailyTrend(resolvedSpaceId, range);
  return {
    granularity: "daily" as const,
    data: daily,
  };
}

export async function getAnalyticsRecurring(
  ownerId: Types.ObjectId,
  spaceId: string,
  minCount: number = 2
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);
  return analyticsRepository.getRecurringTransactions(resolvedSpaceId, minCount);
}

