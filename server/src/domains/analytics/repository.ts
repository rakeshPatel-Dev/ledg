import { Types } from "mongoose";

import { TransactionModel } from "../transactions/model.js";

export interface DateRange {
  from?: Date;
  to?: Date;
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

// ─── Summary ────────────────────────────────────────────────────────────────

export async function getSpaceSummary(
  spaceIds: Types.ObjectId[],
  range?: DateRange
) {
  const match: Record<string, unknown> =
    spaceIds.length === 1 ? { spaceId: spaceIds[0] } : { spaceId: { $in: spaceIds } };
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
  spaceIds: Types.ObjectId[],
  type: "income" | "expense",
  range?: DateRange
): Promise<CategoryBreakdown[]> {
  const match: Record<string, unknown> =
    spaceIds.length === 1 ? { spaceId: spaceIds[0], type } : { spaceId: { $in: spaceIds }, type };
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

// ─── Recurring Transactions ───────────────────────────────────────────────────

export async function getRecurringTransactions(
  spaceIds: Types.ObjectId[],
  minCount: number = 2
): Promise<RecurringGroup[]> {
  const match: Record<string, unknown> =
    spaceIds.length === 1
      ? { spaceId: spaceIds[0], type: "expense" }
      : { spaceId: { $in: spaceIds }, type: "expense" };

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

// ─── Payment Method Breakdown ───────────────────────────────────────────────

export async function getPaymentMethodBreakdown(
  spaceIds: Types.ObjectId[],
  type: "income" | "expense",
  range?: DateRange
): Promise<PaymentMethodBreakdown[]> {
  const match: Record<string, unknown> =
    spaceIds.length === 1
      ? { spaceId: spaceIds[0], type }
      : { spaceId: { $in: spaceIds }, type };
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
  ]);

  return results as PaymentMethodBreakdown[];
}

// ─── Recent Transactions ────────────────────────────────────────────────────

export interface RecentTransaction {
  id: string;
  spaceId: string;
  category: string;
  type: string;
  amount: number;
  note: string;
  date: Date;
  tags: string[];
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getRecentTransactions(
  spaceIds: Types.ObjectId[],
  limit: number = 5
): Promise<RecentTransaction[]> {
  const match: Record<string, unknown> =
    spaceIds.length === 1 ? { spaceId: spaceIds[0] } : { spaceId: { $in: spaceIds } };

  const results = await TransactionModel.aggregate([
    { $match: match },
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
        tags: 1,
        paymentMethod: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return results as RecentTransaction[];
}
