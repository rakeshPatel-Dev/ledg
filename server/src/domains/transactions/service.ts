import { Types } from "mongoose";

import {
  ForbiddenError,
  NotFoundError,
} from "../../common/errors/index.js";
import * as spaceRepository from "../spaces/repository.js";
import * as transactionRepository from "./repository.js";
import { assertSpaceAccess } from "../spaces/access.js";
import { getUserContext } from "./user-context.js";
import * as notificationService from "../notifications/service.js";
import { logger } from "../../config/logger.js";


export async function createUserTransaction(
  userId: Types.ObjectId,
  spaceId: string,
  data: Record<string, unknown>
) {
  const { space } = await assertSpaceAccess(spaceId, userId);
  const user = await getUserContext(userId);

  const createdBy = {
    userId: user.userId,
    name: user.name,
    email: user.email,
    username: user.username,
  };

  const transaction = await transactionRepository.createTransaction({
    spaceId: space._id,
    ...data,
    createdBy,
  });

  // If shared space, notify other members in real-time
  if (space.isShared && space.members && space.members.length > 1) {
    const otherMembers = space.members.filter(
      (m) => m.userId.toString() !== userId.toString()
    );

    if (otherMembers.length > 0) {
      await notificationService.notifyMembers({
        recipientIds: otherMembers.map((m) => m.userId),
        type: "transaction_added",
        data: {
          spaceId: String(space._id),
          spaceName: space.name,
          transactionId: transaction.id,
          actorId: String(userId),
          actorName: user.name,
          transactionType: transaction.type,
          amount: transaction.amount,
        },
      }).catch((e) => logger.error({ error: e }, "Failed to notify on transaction added"));
    }
  }

  return transaction;
}

export async function listUserTransactions(
  userId: Types.ObjectId,
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
  const { space } = await assertSpaceAccess(spaceId, userId);

  const { items, total } = await transactionRepository.findTransactions({
    spaceId: space._id,
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
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getUserTransaction(
  userId: Types.ObjectId,
  spaceId: string,
  transactionId: string
) {
  const { space } = await assertSpaceAccess(spaceId, userId);

  const transaction = await transactionRepository.findTransactionById(
    transactionId,
    space._id
  );

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  return transaction;
}

export async function updateUserTransaction(
  userId: Types.ObjectId,
  spaceId: string,
  transactionId: string,
  data: Record<string, unknown>
) {
  const { fromSpaceId, ...updateData } = data;
  const fromSpace = fromSpaceId as string | undefined;
  const isMove = Boolean(fromSpace && fromSpace !== spaceId);

  // The transaction lives in the source space; when moving, `spaceId` is the
  // destination and `fromSpaceId` the current home. When editing in place they
  // are the same space.
  const sourceSpaceId = isMove ? fromSpace! : spaceId;
  const sourceAccess = await assertSpaceAccess(sourceSpaceId, userId);
  const user = await getUserContext(userId);

  const existingTxn = await transactionRepository.findTransactionById(
    transactionId,
    sourceAccess.space._id
  );

  if (!existingTxn) {
    throw new NotFoundError("Transaction");
  }

  // Permission check: source-space owner can edit anything in the space;
  // a member can only edit/edit-move their own transactions.
  const isCreator =
    existingTxn.createdBy?.userId &&
    existingTxn.createdBy.userId.toString() === userId.toString();

  if (sourceAccess.role !== "owner" && !isCreator) {
    throw new ForbiddenError(
      "You can only edit transactions created by yourself"
    );
  }

  let updatedTransaction;

  if (isMove) {
    // Moving also requires access to the destination space.
    const targetAccess = await assertSpaceAccess(spaceId, userId);

    updatedTransaction = await transactionRepository.moveTransaction(
      transactionId,
      sourceAccess.space._id,
      targetAccess.space._id,
      updateData
    );
  } else {
    updatedTransaction = await transactionRepository.updateTransaction(
      transactionId,
      sourceAccess.space._id,
      updateData
    );
  }

  if (!updatedTransaction) {
    throw new NotFoundError("Transaction");
  }

  // If owner modified someone else's transaction, notify the creator
  if (
    sourceAccess.role === "owner" &&
    existingTxn.createdBy?.userId &&
    existingTxn.createdBy.userId.toString() !== userId.toString()
  ) {
    await notificationService.notify({
      userId: existingTxn.createdBy.userId,
      type: "transaction_modified",
      variant: "edited",
      data: {
        spaceId: String(sourceAccess.space._id),
        spaceName: sourceAccess.space.name,
        transactionId: updatedTransaction.id,
        actorId: String(userId),
        actorName: user.name,
        amount: updatedTransaction.amount,
      },
    }).catch((e) => logger.error({ error: e }, "Failed to notify creator of txn edit"));
  }

  return updatedTransaction;
}

export async function deleteUserTransaction(
  userId: Types.ObjectId,
  spaceId: string,
  transactionId: string
) {
  const { space, role } = await assertSpaceAccess(spaceId, userId);
  const user = await getUserContext(userId);

  const existingTxn = await transactionRepository.findTransactionById(
    transactionId,
    space._id
  );

  if (!existingTxn) {
    throw new NotFoundError("Transaction");
  }

  const isCreator =
    existingTxn.createdBy?.userId &&
    existingTxn.createdBy.userId.toString() === userId.toString();

  if (role !== "owner" && !isCreator) {
    throw new ForbiddenError(
      "You can only delete transactions created by yourself"
    );
  }

  const deleted = await transactionRepository.deleteTransaction(
    transactionId,
    space._id
  );

  if (!deleted) {
    throw new NotFoundError("Transaction");
  }

  // If owner deleted someone else's transaction, notify the creator
  if (
    role === "owner" &&
    existingTxn.createdBy?.userId &&
    existingTxn.createdBy.userId.toString() !== userId.toString()
  ) {
    await notificationService.notify({
      userId: existingTxn.createdBy.userId,
      type: "transaction_modified",
      variant: "deleted",
      data: {
        spaceId: String(space._id),
        spaceName: space.name,
        actorId: String(userId),
        actorName: user.name,
        amount: existingTxn.amount,
      },
    }).catch((e) => logger.error({ error: e }, "Failed to notify creator of txn deletion"));
  }

  return { id: transactionId };
}

export interface ListAllFilters {
  type?: string;
  spaceId?: string;
  keyword?: string;
}

export async function listAllUserTransactions(
  userId: Types.ObjectId,
  page = 1,
  pageSize = 20,
  filters: ListAllFilters = {}
) {
  let spaceIds: Types.ObjectId[];

  if (filters.spaceId && filters.spaceId !== "all") {
    const { space } = await assertSpaceAccess(filters.spaceId, userId);
    spaceIds = [space._id];
  } else {
    // Union of all spaces where user is owner or member
    const spaces = await spaceRepository.findSpacesForUser(userId);
    spaceIds = spaces.map((s) => s._id);
  }

  const { items, total } = await transactionRepository.findAllTransactionsByOwner(
    spaceIds,
    page,
    pageSize,
    { type: filters.type, keyword: filters.keyword }
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}