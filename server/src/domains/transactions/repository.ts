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

  const total = await TransactionModel.countDocuments(filter);
  const items = await TransactionModel.find(filter)
    .sort({ date: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return { items: items.map(toTransactionDto), total };
}

export async function findTransactionById(
  id: string,
  spaceId: Types.ObjectId
): Promise<TransactionDoc | null> {
  const doc = await TransactionModel.findOne({ _id: id, spaceId }).lean();
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

export async function findAllTransactionsByOwner(
  ownerSpaceIds: Types.ObjectId[],
  pageSize = 100
): Promise<TransactionDoc[]> {
  if (ownerSpaceIds.length === 0) return [];

  const docs = await TransactionModel.find({ spaceId: { $in: ownerSpaceIds } })
    .sort({ date: -1 })
    .limit(pageSize)
    .lean();

  return docs.map(toTransactionDto);
}