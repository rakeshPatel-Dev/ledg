import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";

import { TransactionModel } from "../transactions/model.js";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SummaryTotals {
  totalIncome: number;
  totalExpense: number;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
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

export interface RecentTransaction {
  id: string;
  spaceId: string;
  category: string;
  type: string;
  amount: number;
  note: string;
  date: Date;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardData {
  allTime: SummaryTotals;
  month: SummaryTotals;
  expenseCategories: CategoryBreakdown[];
  incomeCategories: CategoryBreakdown[];
  paymentMethods: PaymentMethodBreakdown[];
  recentTransactions: RecentTransaction[];
}

export interface AnalyticsSummaryData {
  current: SummaryTotals;
  previous: SummaryTotals;
  currentExpenseCategories: CategoryBreakdown[];
  previousExpenseCategories: CategoryBreakdown[];
  currentIncomeCategories: CategoryBreakdown[];
}

const ZERO_TOTALS: SummaryTotals = { totalIncome: 0, totalExpense: 0, count: 0 };

// ─── Pipeline fragments ──────────────────────────────────────────────────────
//
// Every read below starts with an indexed `$match` on `spaceId` and then uses
// `$facet` so all the dashboard/analytics buckets are computed in one round
// trip. See phases.md for the trade-off (in-memory bucketing after the first
// indexed match).

function spaceMatch(spaceIds: Types.ObjectId[]): Record<string, unknown> {
  return spaceIds.length === 1
    ? { spaceId: spaceIds[0] }
    : { spaceId: { $in: spaceIds } };
}

function dateMatch(range?: DateRange): Record<string, unknown> {
  if (!range?.from && !range?.to) return {};

  const condition: Record<string, Date> = {};
  if (range.from) condition.$gte = range.from;
  if (range.to) condition.$lte = range.to;
  return { date: condition };
}

function summaryGroupStage(): PipelineStage.FacetPipelineStage[] {
  return [
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
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpense: 1,
        count: 1,
      },
    },
  ];
}

function categoryGroupStages(): PipelineStage.FacetPipelineStage[] {
  return [
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
  ];
}

function recentTransactionStages(
  limit: number
): PipelineStage.FacetPipelineStage[] {
  return [
    { $sort: { date: -1 } },
    { $limit: limit },
    {
      $addFields: {
        id: { $toString: "$_id" },
        spaceId: { $toString: "$spaceId" },
      },
    },
    {
      $project: {
        _id: 0,
        id: 1,
        spaceId: 1,
        category: 1,
        type: 1,
        amount: 1,
        note: 1,
        date: 1,
        paymentMethod: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
//
// Replaces six independent aggregations (all-time totals, month totals, two
// category breakdowns, payment methods, recent transactions) with one.

export async function getDashboardData(
  spaceIds: Types.ObjectId[],
  monthStart: Date
): Promise<DashboardData> {
  const monthMatch = { date: { $gte: monthStart } };
  const monthLedgerMatch = {
    ...monthMatch,
    source: { $ne: "dues" },
  };

  const [result] = await TransactionModel.aggregate<{
    allTime: SummaryTotals[];
    month: SummaryTotals[];
    expenseCategories: CategoryBreakdown[];
    incomeCategories: CategoryBreakdown[];
    paymentMethods: PaymentMethodBreakdown[];
    recentTransactions: RecentTransaction[];
  }>([
    { $match: spaceMatch(spaceIds) },
    {
      $facet: {
        allTime: summaryGroupStage(),
        month: [{ $match: monthMatch }, ...summaryGroupStage()],
        expenseCategories: [
          { $match: { ...monthLedgerMatch, type: "expense" } },
          ...categoryGroupStages(),
        ],
        incomeCategories: [
          { $match: { ...monthLedgerMatch, type: "income" } },
          ...categoryGroupStages(),
        ],
        paymentMethods: [
          { $match: { ...monthLedgerMatch, type: "expense" } },
          {
            $group: {
              _id: { $ifNull: ["$paymentMethod", "cash"] },
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { amount: -1 } },
          {
            $project: {
              _id: 0,
              method: "$_id",
              amount: 1,
              count: 1,
            },
          },
        ],
        recentTransactions: recentTransactionStages(5),
      },
    },
  ]);

  return {
    allTime: result?.allTime[0] ?? ZERO_TOTALS,
    month: result?.month[0] ?? ZERO_TOTALS,
    expenseCategories: result?.expenseCategories ?? [],
    incomeCategories: result?.incomeCategories ?? [],
    paymentMethods: result?.paymentMethods ?? [],
    recentTransactions: result?.recentTransactions ?? [],
  };
}

// ─── Analytics summary ──────────────────────────────────────────────────────
//
// Replaces five independent aggregations (current/previous totals + three
// category breakdowns) with one.

export async function getAnalyticsSummaryData(
  spaceIds: Types.ObjectId[],
  range: DateRange,
  previousRange: DateRange
): Promise<AnalyticsSummaryData> {
  const currentMatch = dateMatch(range);
  const previousMatch = dateMatch(previousRange);

  const [result] = await TransactionModel.aggregate<{
    current: SummaryTotals[];
    previous: SummaryTotals[];
    currentExpenseCategories: CategoryBreakdown[];
    previousExpenseCategories: CategoryBreakdown[];
    currentIncomeCategories: CategoryBreakdown[];
  }>([
    { $match: spaceMatch(spaceIds) },
    {
      $facet: {
        current: [{ $match: currentMatch }, ...summaryGroupStage()],
        previous: [{ $match: previousMatch }, ...summaryGroupStage()],
        currentExpenseCategories: [
          {
            $match: {
              ...currentMatch,
              type: "expense",
              source: { $ne: "dues" },
            },
          },
          ...categoryGroupStages(),
        ],
        previousExpenseCategories: [
          {
            $match: {
              ...previousMatch,
              type: "expense",
              source: { $ne: "dues" },
            },
          },
          ...categoryGroupStages(),
        ],
        currentIncomeCategories: [
          {
            $match: {
              ...currentMatch,
              type: "income",
              source: { $ne: "dues" },
            },
          },
          ...categoryGroupStages(),
        ],
      },
    },
  ]);

  return {
    current: result?.current[0] ?? ZERO_TOTALS,
    previous: result?.previous[0] ?? ZERO_TOTALS,
    currentExpenseCategories: result?.currentExpenseCategories ?? [],
    previousExpenseCategories: result?.previousExpenseCategories ?? [],
    currentIncomeCategories: result?.currentIncomeCategories ?? [],
  };
}

// ─── Recurring Transactions ───────────────────────────────────────────────────

export async function getRecurringTransactions(
  spaceIds: Types.ObjectId[],
  minCount: number = 2,
  limit: number = 20
): Promise<RecurringGroup[]> {
  const match = {
    ...spaceMatch(spaceIds),
    type: "expense",
    source: { $ne: "dues" },
  };

  const results = await TransactionModel.aggregate([
    { $match: match },
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
    { $limit: limit },
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
