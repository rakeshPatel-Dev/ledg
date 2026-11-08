import { Types } from "mongoose";

import { TransactionModel, type TransactionDoc } from "./model.js";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface TransactionQuery {
  spaceId: Types.ObjectId;
  category?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export async function createTransaction(
  data: Record<string, unknown>
): Promise<TransactionDoc> {
  const doc = await TransactionModel.create(data);
  return toTransactionDto(doc.toObject());
}

/**
 * Insert many transactions in chunks. `ordered: false` lets valid rows land
 * even if one document fails validation; the caller reports the shortfall.
 * The inserted ids are returned so an import can be undone.
 */
export async function createManyTransactions(
  docs: Record<string, unknown>[]
): Promise<{ inserted: number; ids: string[] }> {
  if (docs.length === 0) return { inserted: 0, ids: [] };

  const CHUNK_SIZE = 500;
  let inserted = 0;
  const ids: string[] = [];

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    try {
      const result = await TransactionModel.insertMany(chunk, {
        ordered: false,
      });
      inserted += result.length;
      ids.push(...result.map((doc) => String(doc._id)));
    } catch (error) {
      // BulkWriteError carries how many documents made it in before the
      // failures; keep those and let the caller report the rest. Mongoose
      // exposes insertedDocs for unordered inserts, while the driver reports
      // insertedIds on the result.
      const bulk = error as {
        result?: {
          insertedCount?: number;
          insertedIds?: Record<string, unknown> | Map<string, unknown>;
        };
        insertedDocs?: Array<{ _id?: unknown }>;
      };
      inserted += bulk.result?.insertedCount ?? bulk.insertedDocs?.length ?? 0;

      const insertedIds = bulk.result?.insertedIds;
      if (insertedIds instanceof Map) {
        ids.push(...[...insertedIds.values()].map((id) => String(id)));
      } else if (insertedIds) {
        ids.push(...Object.values(insertedIds).map((id) => String(id)));
      } else {
        ids.push(
          ...(bulk.insertedDocs ?? []).map((doc) => String(doc._id))
        );
      }
    }
  }

  return { inserted, ids };
}

/** Transactions the user created that can be removed by an import undo. */
export async function findUserCreatedTransactionIds(
  ids: string[],
  userId: Types.ObjectId
): Promise<Array<{ id: string; spaceId: string }>> {
  const docs = await TransactionModel.find({
    _id: { $in: ids },
    "createdBy.userId": userId,
    source: { $ne: "dues" },
  })
    .select("_id spaceId")
    .lean();

  return docs.map((doc) => ({
    id: String(doc._id),
    spaceId: String(doc.spaceId),
  }));
}

/** Delete only transactions created by the user (undo path). */
export async function deleteUserCreatedTransactions(
  ids: string[],
  userId: Types.ObjectId
): Promise<number> {
  const result = await TransactionModel.deleteMany({
    _id: { $in: ids },
    "createdBy.userId": userId,
    source: { $ne: "dues" },
  });
  return result.deletedCount ?? 0;
}

/**
 * Minimal projection used to detect duplicates before an import. Scoped to a
 * date range so a large space is not loaded wholesale.
 */
export async function findTransactionsForDedupe(
  spaceIds: Types.ObjectId[],
  from: Date,
  to: Date
): Promise<
  Array<{
    spaceId: Types.ObjectId;
    type: string;
    amount: number;
    category: string;
    note: string;
    date: Date;
  }>
> {
  if (spaceIds.length === 0) return [];

  return TransactionModel.find({
    spaceId: { $in: spaceIds },
    date: { $gte: from, $lte: to },
  })
    .select({ spaceId: 1, type: 1, amount: 1, category: 1, note: 1, date: 1 })
    .lean();
}

export async function findTransactions(
  query: TransactionQuery
): Promise<{ items: TransactionDoc[]; total: number }> {
  const {
    spaceId,
    category,
    type,
    dateFrom,
    dateTo,
    keyword,
    page = 1,
    pageSize = 20,
  } = query;

  const filter: Record<string, unknown> = { spaceId };

  if (category) {
    filter.category = category;
  }

  if (type) {
    filter.type = type;
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) {
      dateFilter.$gte = dateFrom;
    }
    if (dateTo) {
      dateFilter.$lte = dateTo;
    }
    filter.date = dateFilter;
  }

  if (keyword) {
    const safe = escapeRegex(keyword);
    filter.$or = [
      { note: { $regex: safe, $options: "i" } },
      { category: { $regex: safe, $options: "i" } },
    ];
  }

  const [total, items] = await Promise.all([
    TransactionModel.countDocuments(filter),
    TransactionModel.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  return { items: items.map(toTransactionDto), total };
}

export async function findTransactionById(
  id: string,
  spaceId: Types.ObjectId
): Promise<TransactionDoc | null> {
  const doc = await TransactionModel.findOne({ _id: id, spaceId }).lean();
  return doc ? toTransactionDto(doc) : null;
}

export async function findTransactionInSpaces(
  id: string,
  spaceIds: Types.ObjectId[]
): Promise<TransactionDoc | null> {
  if (spaceIds.length === 0) return null;
  const doc = await TransactionModel.findOne({
    _id: id,
    spaceId: { $in: spaceIds },
  }).lean();
  return doc ? toTransactionDto(doc) : null;
}

export async function updateTransaction(
  id: string,
  spaceId: Types.ObjectId,
  data: Record<string, unknown>
): Promise<TransactionDoc | null> {
  const doc = await TransactionModel.findOneAndUpdate(
    { _id: id, spaceId },
    data,
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).lean();
  return doc ? toTransactionDto(doc) : null;
}

export async function moveTransaction(
  id: string,
  fromSpaceId: Types.ObjectId,
  toSpaceId: Types.ObjectId,
  data: Record<string, unknown>
): Promise<TransactionDoc | null> {
  const doc = await TransactionModel.findOneAndUpdate(
    { _id: id, spaceId: fromSpaceId },
    { ...data, spaceId: toSpaceId },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).lean();
  return doc ? toTransactionDto(doc) : null;
}

export async function deleteTransaction(
  id: string,
  spaceId: Types.ObjectId
): Promise<boolean> {
  const result = await TransactionModel.deleteOne({ _id: id, spaceId });
  return result.deletedCount > 0;
}

function toTransactionDto(doc: Record<string, unknown>): TransactionDoc {
  return { ...doc, id: String(doc._id) } as unknown as TransactionDoc;
}

export interface AllTransactionsFilters {
  type?: string;
  keyword?: string;
}

export async function findAllTransactionsByOwner(
  ownerSpaceIds: Types.ObjectId[],
  page = 1,
  pageSize = 20,
  filters: AllTransactionsFilters = {}
): Promise<{ items: TransactionDoc[]; total: number }> {
  if (ownerSpaceIds.length === 0) return { items: [], total: 0 };

  const filter: Record<string, unknown> = { spaceId: { $in: ownerSpaceIds } };

  if (filters.type) {
    filter.type = filters.type;
  }

  if (filters.keyword) {
    const safe = escapeRegex(filters.keyword);
    filter.$or = [
      { note: { $regex: safe, $options: "i" } },
      { category: { $regex: safe, $options: "i" } },
    ];
  }

  const [total, docs] = await Promise.all([
    TransactionModel.countDocuments(filter),
    TransactionModel.find(filter)
      .sort({ date: -1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  return { items: docs.map(toTransactionDto), total };
}