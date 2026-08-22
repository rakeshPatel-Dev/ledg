import type { Types } from "mongoose";

import { NotFoundError } from "../../common/errors/index.js";
import * as spaceRepository from "../spaces/repository.js";
import * as transactionRepository from "./repository.js";

async function resolveSpace(spaceId: string, ownerId: Types.ObjectId) {
  const space = await spaceRepository.findSpaceById(
    spaceId,
    ownerId
  );

  if (!space) {
    throw new NotFoundError("Space");
  }

  return space._id;
}

export async function createUserTransaction(
  ownerId: Types.ObjectId,
  spaceId: string,
  data: Record<string, unknown>
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const transaction = await transactionRepository.createTransaction({
    spaceId: resolvedSpaceId,
    ...data,
  });

  return transaction;
}

export async function listUserTransactions(
  ownerId: Types.ObjectId,
  spaceId: string,
  query: {
    category?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const { items, total } = await transactionRepository.findTransactions({
    spaceId: resolvedSpaceId,
    category: query.category,
    type: query.type,
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    keyword: query.keyword,
    page: query.page,
    pageSize: query.pageSize,
  });

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getUserTransaction(
  ownerId: Types.ObjectId,
  spaceId: string,
  transactionId: string
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const transaction = await transactionRepository.findTransactionById(
    transactionId,
    resolvedSpaceId
  );

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  return transaction;
}

export async function updateUserTransaction(
  ownerId: Types.ObjectId,
  spaceId: string,
  transactionId: string,
  data: Record<string, unknown>
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const transaction = await transactionRepository.updateTransaction(
    transactionId,
    resolvedSpaceId,
    data
  );

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  return transaction;
}

export async function deleteUserTransaction(
  ownerId: Types.ObjectId,
  spaceId: string,
  transactionId: string
) {
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const deleted = await transactionRepository.deleteTransaction(
    transactionId,
    resolvedSpaceId
  );

  if (!deleted) {
    throw new NotFoundError("Transaction");
  }

  return { id: transactionId };
}

export async function listAllUserTransactions(
  ownerId: Types.ObjectId,
  pageSize = 100
) {
  const spaces = await spaceRepository.findSpacesByOwner(ownerId);
  const spaceIds = spaces.map((s) => s._id);

  const items = await transactionRepository.findAllTransactionsByOwner(
    spaceIds,
    pageSize
  );

  return { items, total: items.length };
}