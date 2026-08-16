import { Types } from "mongoose";

import { TransactionModel } from "../transactions/model.js";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface MonthlyTotals {
  year: number;
  month: number; // 1-12
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

export interface TrendPoint {
  date: string; // ISO date string YYYY-MM-DD
  income: number;
  expense: number;
}

export interface RecurringGroup {
  key: string; // note or category fingerprint
  category: string;
  note: string;
  amount: number;
  count: number;
  totalSpent: number;
  lastDate: Date;
}

// ─── Summary ────────────────────────────────────────────────────────────────

export async function getSpaceSummary(
  spaceId: Types.ObjectId,
  range?: DateRange
) {
  const match: Record<string, unknown> = { spaceId };
  if (range?.from || range?.to) {
    const dateCond: Record<string, Date> = {};
    if (range.from) dateCond.$gte = range.from;
    if (range.to) dateCond.$lte = range.to;
    match.date = dateCond;
  }

  const [totals] = await TransactionModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  return totals ?? { totalIncome: 0, totalExpense: 0, count: 0 };
}

// ─── Category Breakdown ──────────────────────────────────────────────────────

export async function getCategoryBreakdown(
  spaceId: Types.ObjectId,
  type: "income" | "expense",
  range?: DateRange
): Promise<CategoryBreakdown[]> {
  const match: Record<string, unknown> = { spaceId, type };
  if (range?.from || range?.to) {
    const dateCond: Record<string, Date> = {};
    if (range.from) dateCond.$gte = range.from;
    if (range.to) dateCond.$lte = range.to;
    match.date = dateCond;
  }

  const results = await TransactionModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$category",
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { amount: -1 } },
    {
      $project: {
        _id: 0,
        category: "$_id",
        amount: 1,
        count: 1,
      },
    },
  ]);

  return results as CategoryBreakdown[];
}

// ─── Monthly Trend (last N months) ──────────────────────────────────────────

export async function getMonthlyTrend(
  spaceId: Types.ObjectId,
  months: number = 6
): Promise<MonthlyTotals[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const results = await TransactionModel.aggregate([
    { $match: { spaceId, date: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        income: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        expense: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        income: 1,
        expense: 1,
      },
    },
  ]);

  return results as MonthlyTotals[];
}

// ─── Daily Trend (within a range) ────────────────────────────────────────────

export async function getDailyTrend(
  spaceId: Types.ObjectId,
  range: DateRange
): Promise<TrendPoint[]> {
  const match: Record<string, unknown> = { spaceId };
  if (range.from || range.to) {
    const dateCond: Record<string, Date> = {};
    if (range.from) dateCond.$gte = range.from;
    if (range.to) dateCond.$lte = range.to;
    match.date = dateCond;
  }

  const results = await TransactionModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$date" },
        },
        income: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        expense: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        income: 1,
        expense: 1,
      },
    },
  ]);

  return results as TrendPoint[];
}

// ─── Recurring Transactions ───────────────────────────────────────────────────

export async function getRecurringTransactions(
  spaceId: Types.ObjectId,
  minCount: number = 2
): Promise<RecurringGroup[]> {
  // Group by category + note (trimmed lowercase) for expense transactions
  // that appeared at least minCount times
  const results = await TransactionModel.aggregate([
    { $match: { spaceId, type: "expense" } },
    {
      $group: {
        _id: {
          category: "$category",
          // normalise note: lowercase, trim
          note: {
            $toLower: { $trim: { input: { $ifNull: ["$note", ""] } } },
          },
        },
        count: { $sum: 1 },
        totalSpent: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
        lastDate: { $max: "$date" },
        sampleNote: { $first: "$note" },
      },
    },
    { $match: { count: { $gte: minCount } } },
    { $sort: { totalSpent: -1 } },
    {
      $project: {
        _id: 0,
        key: {
          $concat: ["$_id.category", "|", { $ifNull: ["$_id.note", ""] }],
        },
        category: "$_id.category",
        note: { $ifNull: ["$sampleNote", ""] },
        amount: { $round: ["$avgAmount", 2] },
        count: 1,
        totalSpent: 1,
        lastDate: 1,
      },
    },
  ]);

  return results as RecurringGroup[];
}

// ─── Previous Period Comparison ───────────────────────────────────────────────

export async function getPeriodTotals(
  spaceId: Types.ObjectId,
  range: DateRange
) {
  return getSpaceSummary(spaceId, range);
}
