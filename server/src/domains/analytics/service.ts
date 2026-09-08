import type { Types } from "mongoose";

import * as spaceRepository from "../spaces/repository.js";
import * as analyticsRepository from "./repository.js";
import { assertSpaceAccess } from "../spaces/access.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveSpaceIds(spaceId: string, userId: Types.ObjectId): Promise<Types.ObjectId[]> {
  if (spaceId === "all") {
    const spaces = await spaceRepository.findSpacesForUser(userId);
    return spaces.map((s) => s._id);
  }
  const access = await assertSpaceAccess(spaceId, userId);
  return [access.space._id];
}


type Period = "today" | "month" | "3months" | "year" | "all" | "custom";

interface DateRangeOptions {
  dateFrom?: string;
  dateTo?: string;
}

// All calendar periods ("today", "month", ...) are computed in a fixed app
// timezone instead of the server's local clock (UTC on Vercel). Without this,
// users in UTC+05:45 see transactions land in the wrong day/month bucket.
const APP_TZ_OFFSET_MINUTES = 345; // Asia/Kathmandu (UTC+05:45), no DST

function zonedParts(date: Date): { y: number; m: number; d: number } {
  const shifted = new Date(date.getTime() + APP_TZ_OFFSET_MINUTES * 60_000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
  };
}

function zonedBoundary(
  y: number,
  m: number,
  d: number,
  endOfDay = false
): Date {
  const ms = endOfDay
    ? Date.UTC(y, m, d, 23, 59, 59, 999)
    : Date.UTC(y, m, d, 0, 0, 0, 0);
  return new Date(ms - APP_TZ_OFFSET_MINUTES * 60_000);
}

function parseDayParts(
  raw: string | undefined
): { y: number; m: number; d: number } | null {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function firstOfZonedMonth(monthOffset: number): Date {
  const now = zonedParts(new Date());
  const shifted = new Date(Date.UTC(now.y, now.m + monthOffset, 1));
  return zonedBoundary(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
}

function dateRangeForPeriod(
  period: Period,
  options?: DateRangeOptions
): { from?: Date; to?: Date } {
  if (period === "all") return {};

  if (period === "today") {
    const { y, m, d } = zonedParts(new Date());
    return { from: zonedBoundary(y, m, d), to: zonedBoundary(y, m, d, true) };
  }

  if (period === "custom") {
    const dateFrom = options?.dateFrom;
    const dateTo = options?.dateTo;

    if (!dateFrom && !dateTo) {
      // Default to today if custom dates not specified yet
      const { y, m, d } = zonedParts(new Date());
      return { from: zonedBoundary(y, m, d), to: zonedBoundary(y, m, d, true) };
    }

    // Only one bound given → single-day range on that bound
    const fromSrc = dateFrom ?? dateTo;
    const toSrc = dateTo ?? dateFrom;
    const fromParts = parseDayParts(fromSrc);
    const toParts = parseDayParts(toSrc);

    return {
      from: fromParts ? zonedBoundary(fromParts.y, fromParts.m, fromParts.d) : undefined,
      to: toParts ? zonedBoundary(toParts.y, toParts.m, toParts.d, true) : undefined,
    };
  }

  if (period === "month") return { from: firstOfZonedMonth(0) };
  if (period === "3months") return { from: firstOfZonedMonth(-2) };

  const { y } = zonedParts(new Date());
  return { from: zonedBoundary(y, 0, 1) }; // year
}

function prevDateRangeForPeriod(
  period: Period,
  options?: DateRangeOptions
): { from?: Date; to?: Date } {
  if (period === "all") return {};

  const currentRange = dateRangeForPeriod(period, options);
  if (!currentRange.from) return {};

  // "today" and "custom" shift back by the range's own duration.
  // For custom ranges with a single bound, dateRangeForPeriod already
  // defaults `to` to that same day's end, so duration is a full day.
  if (period === "today" || period === "custom") {
    const duration = (currentRange.to?.getTime() ?? 0) - currentRange.from.getTime();
    const prevTo = new Date(currentRange.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - duration);
    return { from: prevFrom, to: prevTo };
  }

  if (period === "month") {
    return { from: firstOfZonedMonth(-1), to: new Date(firstOfZonedMonth(0).getTime() - 1) };
  }
  if (period === "3months") {
    return { from: firstOfZonedMonth(-5), to: new Date(firstOfZonedMonth(-2).getTime() - 1) };
  }

  // year
  const { y } = zonedParts(new Date());
  return {
    from: zonedBoundary(y - 1, 0, 1),
    to: new Date(zonedBoundary(y, 0, 1).getTime() - 1),
  };
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
  const resolvedSpaceIds = await resolveSpaceIds(spaceId, ownerId);

  const range = dateRangeForPeriod(period, options);
  const prevRange = prevDateRangeForPeriod(period, options);

  const [current, previous, currentExpCats, prevExpCats, currentIncCats] =
    await Promise.all([
      analyticsRepository.getSpaceSummary(resolvedSpaceIds, range),
      analyticsRepository.getSpaceSummary(resolvedSpaceIds, prevRange),
      analyticsRepository.getCategoryBreakdown(resolvedSpaceIds, "expense", range),
      analyticsRepository.getCategoryBreakdown(resolvedSpaceIds, "expense", prevRange),
      analyticsRepository.getCategoryBreakdown(resolvedSpaceIds, "income", range),
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

export async function getAnalyticsRecurring(
  ownerId: Types.ObjectId,
  spaceId: string,
  minCount: number = 2,
  limit: number = 20
) {
  const resolvedSpaceIds = await resolveSpaceIds(spaceId, ownerId);
  return analyticsRepository.getRecurringTransactions(resolvedSpaceIds, minCount, limit);
}

// ─── Dashboard Summary (single endpoint for all dashboard data) ────────────

export async function getDashboardSummary(ownerId: Types.ObjectId) {
  const resolvedSpaceIds = await resolveSpaceIds("all", ownerId);

  if (resolvedSpaceIds.length === 0) {
    return {
      totalBalance: 0,
      monthIncome: 0,
      monthSpend: 0,
      byCategory: [],
      byIncomeCategory: [],
      byPaymentMethod: [],
      recentTransactions: [],
      transactionCount: 0,
    };
  }

  const now = zonedParts(new Date());
  const monthStart = zonedBoundary(now.y, now.m, 1);

  const [
    allTimeSummary,
    monthSummary,
    expenseCategories,
    incomeCategories,
    expensePaymentMethods,
    recentTransactions,
  ] = await Promise.all([
    analyticsRepository.getSpaceSummary(resolvedSpaceIds),
    analyticsRepository.getSpaceSummary(resolvedSpaceIds, { from: monthStart }),
    analyticsRepository.getCategoryBreakdown(resolvedSpaceIds, "expense", { from: monthStart }),
    analyticsRepository.getCategoryBreakdown(resolvedSpaceIds, "income", { from: monthStart }),
    analyticsRepository.getPaymentMethodBreakdown(resolvedSpaceIds, "expense", { from: monthStart }),
    analyticsRepository.getRecentTransactions(resolvedSpaceIds, 5),
  ]);

  return {
    totalBalance: allTimeSummary.totalIncome - allTimeSummary.totalExpense,
    monthIncome: monthSummary.totalIncome,
    monthSpend: monthSummary.totalExpense,
    byCategory: expenseCategories,
    byIncomeCategory: incomeCategories,
    byPaymentMethod: expensePaymentMethods,
    recentTransactions,
    transactionCount: allTimeSummary.count,
  };
}

