import { Types } from "mongoose";

import { NotFoundError } from "../../common/errors/index.js";
import { findOrCreateUser } from "../users/repository.js";
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
  clerkId: string,
  spaceId: string,
  data: Record<string, unknown>
) {
  const ownerId = await findOrCreateUser(clerkId);
  const resolvedSpaceId = await resolveSpace(spaceId, ownerId);

  const transaction = await transactionRepository.createTransaction({
    spaceId: resolvedSpaceId,
    ...data,
  });

  return transaction;
}

export async function listUserTransactions(
  clerkId: string,
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
  const ownerId = await findOrCreateUser(clerkId);
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
  clerkId: string,
  spaceId: string,
  transactionId: string
) {
  const ownerId = await findOrCreateUser(clerkId);
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
  clerkId: string,
  spaceId: string,
  transactionId: string,
  data: Record<string, unknown>
) {
  const ownerId = await findOrCreateUser(clerkId);
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
  clerkId: string,
  spaceId: string,
  transactionId: string
) {
  const ownerId = await findOrCreateUser(clerkId);
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