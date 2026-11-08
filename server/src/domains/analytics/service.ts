import type { Types } from "mongoose";

import * as spaceRepository from "../spaces/repository.js";
import * as analyticsRepository from "./repository.js";
import type {
  CategoryBreakdown,
  PaymentMethodBreakdown,
  RecentTransaction,
  TrendGranularity,
  TrendPoint,
} from "./repository.js";
import { getCachedDashboard, setCachedDashboard } from "./cache.js";
import { assertSpaceAccess } from "../spaces/access.js";
import { logger } from "../../config/logger.js";

export interface DashboardSummary {
  /** All-time operating income minus operating expenses. Dues/loans excluded. */
  totalBalance: number;
  /** This month's operating income. Dues/loans excluded. */
  monthIncome: number;
  /** This month's operating spending. Dues/loans excluded. */
  monthSpend: number;
  byCategory: CategoryBreakdown[];
  byIncomeCategory: CategoryBreakdown[];
  byPaymentMethod: PaymentMethodBreakdown[];
  recentTransactions: RecentTransaction[];
  transactionCount: number;
}

const EMPTY_DASHBOARD: DashboardSummary = {
  totalBalance: 0,
  monthIncome: 0,
  monthSpend: 0,
  byCategory: [],
  byIncomeCategory: [],
  byPaymentMethod: [],
  recentTransactions: [],
  transactionCount: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveSpaceIds(
  spaceId: string,
  userId: Types.ObjectId
): Promise<Types.ObjectId[]> {
  if (spaceId === "all") {
    return spaceRepository.findSpaceIdsForUser(userId);
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
export const APP_TZ_OFFSET_MINUTES = 345; // Asia/Kathmandu (UTC+05:45), no DST
const DAY_MS = 24 * 60 * 60 * 1000;

export function zonedParts(date: Date): { y: number; m: number; d: number } {
  const shifted = new Date(date.getTime() + APP_TZ_OFFSET_MINUTES * 60_000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
  };
}

export function zonedBoundary(y: number, m: number, d: number, endOfDay = false): Date {
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

export function dateRangeForPeriod(
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

export function prevDateRangeForPeriod(
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
    return {
      from: firstOfZonedMonth(-1),
      to: new Date(firstOfZonedMonth(0).getTime() - 1),
    };
  }
  if (period === "3months") {
    return {
      from: firstOfZonedMonth(-5),
      to: new Date(firstOfZonedMonth(-2).getTime() - 1),
    };
  }

  // year
  const { y } = zonedParts(new Date());
  return {
    from: zonedBoundary(y - 1, 0, 1),
    to: new Date(zonedBoundary(y, 0, 1).getTime() - 1),
  };
}

// ─── Trend buckets ───────────────────────────────────────────────────────────

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function zonedDayKey(date: Date): string {
  const { y, m, d } = zonedParts(date);
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

/**
 * Pick the chart resolution from the period. Small windows get fine-grained
 * buckets; anything wider than a quarter switches to months so the chart never
 * has hundreds of unreadable points.
 */
function trendGranularityForPeriod(
  period: Period,
  range: { from?: Date; to?: Date }
): TrendGranularity {
  if (period === "today") return "hour";
  if (period === "month" || period === "3months") return "day";
  if (period === "year" || period === "all") return "month";

  if (!range.from || !range.to) return "day";
  const spanDays = Math.ceil((range.to.getTime() - range.from.getTime()) / DAY_MS);
  return spanDays <= 92 ? "day" : "month";
}

/**
 * Build the full list of expected bucket keys so the chart has a continuous
 * x-axis instead of collapsing empty days/months. Returns an empty list for
 * "all time", where filling from an unknown start would be meaningless.
 */
function trendBucketKeys(
  range: { from?: Date; to?: Date },
  granularity: TrendGranularity,
  now: Date
): string[] {
  if (!range.from) return [];

  const from = range.from;
  const to = range.to ?? now;
  if (to < from) return [];

  if (granularity === "hour") {
    const { y, m, d } = zonedParts(from);
    return Array.from(
      { length: 24 },
      (_, h) => `${y}-${pad2(m + 1)}-${pad2(d)}T${pad2(h)}:00`
    );
  }

  if (granularity === "day") {
    const startParts = zonedParts(from);
    const start = zonedBoundary(startParts.y, startParts.m, startParts.d);
    const keys: string[] = [];
    // The app timezone has no DST, so a fixed 24h step is exact.
    for (let t = start.getTime(); t <= to.getTime(); t += DAY_MS) {
      keys.push(zonedDayKey(new Date(t)));
    }
    return keys;
  }

  const start = zonedParts(from);
  const end = zonedParts(to);
  const keys: string[] = [];
  let y = start.y;
  let m = start.m;
  while (y < end.y || (y === end.y && m <= end.m)) {
    keys.push(`${y}-${pad2(m + 1)}`);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return keys;
}

function fillTrend(points: TrendPoint[], keys: string[]): TrendPoint[] {
  if (keys.length === 0) return points;
  const byKey = new Map(points.map((point) => [point.key, point]));
  return keys.map((key) => byKey.get(key) ?? { key, income: 0, expense: 0 });
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
      ((current.totalExpense - previous.totalExpense) / previous.totalExpense) * 100
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
    const prevMatch = prevCategories.find((p) => p.category === topCurrent.category);
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
    insights.push(`You're over budget by ${deficit.toFixed(2)} — try to cut back`);
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
  const granularity = trendGranularityForPeriod(period, range);

  const data = await analyticsRepository.getAnalyticsSummaryData(
    resolvedSpaceIds,
    range,
    prevRange,
    granularity
  );

  const {
    current,
    previous,
    currentExpenseCategories: currentExpCats,
    previousExpenseCategories: prevExpCats,
    currentIncomeCategories: currentIncCats,
  } = data;

  const trend = fillTrend(data.trend, trendBucketKeys(range, granularity, new Date()));

  const insights = buildInsights(current, previous, currentExpCats, prevExpCats, period);

  // Month-over-month or period-over-period deltas
  const expenseDelta =
    previous.totalExpense > 0
      ? Math.round(
          ((current.totalExpense - previous.totalExpense) / previous.totalExpense) * 100
        )
      : null;

  const incomeDelta =
    previous.totalIncome > 0
      ? Math.round(
          ((current.totalIncome - previous.totalIncome) / previous.totalIncome) * 100
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
    byPaymentMethod: data.paymentMethods,
    trend,
    trendGranularity: granularity,
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
  const cacheKey = String(ownerId);
  const cached = await getCachedDashboard<DashboardSummary>(cacheKey);
  if (cached) return cached;

  const resolvedSpaceIds = await spaceRepository.findSpaceIdsForUser(ownerId);

  if (resolvedSpaceIds.length === 0) {
    return EMPTY_DASHBOARD;
  }

  const now = zonedParts(new Date());
  const monthStart = zonedBoundary(now.y, now.m, 1);

  const startedAt = Date.now();
  const data = await analyticsRepository.getDashboardData(resolvedSpaceIds, monthStart);
  const elapsedMs = Date.now() - startedAt;

  // Surface the aggregation separately from the request total so a slow cache
  // or a slow query can be told apart in the logs.
  if (elapsedMs > 250) {
    logger.warn(
      { elapsedMs, spaces: resolvedSpaceIds.length },
      "Dashboard aggregation slow"
    );
  }

  const payload: DashboardSummary = {
    totalBalance: data.allTime.totalIncome - data.allTime.totalExpense,
    monthIncome: data.month.totalIncome,
    monthSpend: data.month.totalExpense,
    byCategory: data.expenseCategories,
    byIncomeCategory: data.incomeCategories,
    byPaymentMethod: data.paymentMethods,
    recentTransactions: data.recentTransactions,
    transactionCount: data.allTime.count,
  };

  await setCachedDashboard(cacheKey, payload);

  return payload;
}
