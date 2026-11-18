import { Types } from "mongoose";

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../common/errors/index.js";
import { TransactionModel } from "../transactions/model.js";
import type { TransactionDoc } from "../transactions/model.js";
import * as transactionRepository from "../transactions/repository.js";
import { getUserContext } from "../transactions/user-context.js";
import * as spaceRepository from "../spaces/repository.js";
import * as duesRepository from "./repository.js";
import { invalidateDashboardCache } from "../analytics/cache.js";
import { logger } from "../../config/logger.js";
import type { DebtDoc, DebtSettlementDoc } from "./model.js";
import type {
  Debt,
  DebtCreateInput,
  DebtSettlement,
  DebtSettlementInput,
  DebtStatus,
  DebtUpdateInput,
  DuesQuery,
  DuesSummary,
  PaginatedResult,
  Transaction,
} from "../../shared/index.js";

function toLinkedTransactionDto(doc: TransactionDoc): Transaction {
  return {
    ...doc,
    id: String(doc._id),
    spaceId: String(doc.spaceId),
    dueId: doc.dueId ? String(doc.dueId) : null,
  } as unknown as Transaction;
}

function toDebtDto(
  doc: DebtDoc,
  settlements?: DebtSettlementDoc[],
  linkedTransactions?: TransactionDoc[]
): Debt {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    spaceId: String(doc.spaceId),
    direction: doc.direction,
    counterparty: {
      name: doc.counterparty.name,
      phone: doc.counterparty.phone ?? undefined,
      linkedUserId: doc.counterparty.linkedUserId
        ? String(doc.counterparty.linkedUserId)
        : null,
    },
    principal: doc.principal,
    date: doc.date.toISOString(),
    dueDate: doc.dueDate ? doc.dueDate.toISOString() : null,
    note: doc.note ?? "",
    transactionId: doc.transactionId ? String(doc.transactionId) : undefined,
    status: doc.status,
    settledAmount: doc.settledAmount ?? 0,
    settlements: settlements ? settlements.map(toSettlementDto) : undefined,
    linkedTransactions: linkedTransactions
      ? linkedTransactions.map(toLinkedTransactionDto)
      : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toSettlementDto(doc: DebtSettlementDoc): DebtSettlement {
  return {
    id: String(doc._id),
    debtId: String(doc.debtId),
    userId: String(doc.userId),
    spaceId: String(doc.spaceId),
    amount: doc.amount,
    date: doc.date.toISOString(),
    paymentMethod: doc.paymentMethod ?? null,
    note: doc.note ?? "",
    transactionId: doc.transactionId ? String(doc.transactionId) : undefined,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Dues writes also create/delete ledger transactions, so cached dashboards
 * (recent activity and transaction counts) change for every member of the
 * affected space — not just the actor. P&L totals exclude dues, but the cache
 * still needs invalidating.
 */
async function invalidateDuesDashboards(
  userId: Types.ObjectId,
  spaceId: Types.ObjectId
): Promise<void> {
  const memberIds = await spaceRepository.findMemberUserIds(spaceId);
  await invalidateDashboardCache([String(userId), ...memberIds]);
}

async function resolveUserSpace(
  userId: Types.ObjectId,
  spaceId?: string
): Promise<Types.ObjectId> {
  if (spaceId) {
    const space = await spaceRepository.findSpaceById(spaceId, userId);
    if (!space) throw new NotFoundError("Space");
    return space._id;
  }

  const spaces = await spaceRepository.findSpacesByOwner(userId);
  if (spaces.length === 0) {
    throw new NotFoundError("No space found for user");
  }

  const personal = spaces.find((s) => s.type === "personal");
  return personal ? personal._id : spaces[0]._id;
}

export async function createDue(
  userId: Types.ObjectId,
  input: DebtCreateInput
): Promise<Debt> {
  const spaceId = await resolveUserSpace(userId, input.spaceId);
  const user = await getUserContext(userId);

  const txnDate = new Date(input.date);
  const isLent = input.direction === "lent";

  // Auto-create linked ledger transaction
  const txnType = isLent ? "expense" : "income";
  const txnCategory = isLent ? "Due paid" : "Due received";
  const defaultNote = isLent
    ? `Lent to ${input.counterparty.name}`
    : `Borrowed from ${input.counterparty.name}`;

  const transaction = await TransactionModel.create({
    spaceId,
    type: txnType,
    category: txnCategory,
    amount: input.principal,
    date: txnDate,
    paymentMethod: input.paymentMethod ?? null,
    note: input.note?.trim() || defaultNote,
    source: "dues",
    createdBy: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      username: user.username,
    },
  });

  const debtDoc = await duesRepository.createDebt({
    userId,
    spaceId,
    direction: input.direction,
    counterparty: {
      name: input.counterparty.name.trim(),
      phone: input.counterparty.phone?.trim() || null,
      linkedUserId: input.counterparty.linkedUserId
        ? new Types.ObjectId(input.counterparty.linkedUserId)
        : null,
    },
    principal: input.principal,
    date: txnDate,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    note: input.note?.trim() || "",
    transactionId: transaction._id,
    status: "open",
    settledAmount: 0,
  });

  // Stamp the ledger row with the due it belongs to. The debt needs its _id
  // first, which is why this is a second write rather than part of create().
  await TransactionModel.updateOne(
    { _id: transaction._id },
    { $set: { dueId: debtDoc._id } }
  );

  await invalidateDuesDashboards(userId, spaceId);

  return toDebtDto(debtDoc);
}

export async function listDues(
  userId: Types.ObjectId,
  query: DuesQuery
): Promise<PaginatedResult<Debt>> {
  const { items, total } = await duesRepository.findDebtsByUser(userId, {
    status: query.status,
    direction: query.direction,
    person: query.person,
    page: query.page,
    pageSize: query.pageSize,
  });

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  return {
    items: items.map((d) => toDebtDto(d)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getDue(userId: Types.ObjectId, debtId: string): Promise<Debt> {
  const debt = await duesRepository.findDebtById(debtId, userId);
  if (!debt) {
    throw new NotFoundError("Due");
  }

  const settlements = await duesRepository.findSettlementsByDebt(debtId);
  const transactionIds = [
    debt.transactionId,
    ...settlements.map((settlement) => settlement.transactionId),
  ].filter((id): id is Types.ObjectId => Boolean(id));

  const transactions = await transactionRepository.findTransactionsByIds(transactionIds);
  const byId = new Map(transactions.map((txn) => [String(txn._id), txn]));

  // Opening entry first, then settlements newest-first to match the timeline.
  const ordered = [
    debt.transactionId ? byId.get(String(debt.transactionId)) : undefined,
    ...settlements.map((settlement) =>
      settlement.transactionId ? byId.get(String(settlement.transactionId)) : undefined
    ),
  ].filter((txn): txn is TransactionDoc => Boolean(txn));

  return toDebtDto(debt, settlements, ordered);
}

export async function updateDue(
  userId: Types.ObjectId,
  debtId: string,
  input: DebtUpdateInput
): Promise<Debt> {
  const debt = await duesRepository.findDebtById(debtId, userId);
  if (!debt) {
    throw new NotFoundError("Due");
  }

  if (Object.keys(input).length === 0) {
    throw new BadRequestError("No changes provided");
  }

  const update: Partial<DebtDoc> = {};

  if (input.counterparty) {
    update.counterparty = {
      name: input.counterparty.name.trim(),
      phone: input.counterparty.phone?.trim() || null,
      linkedUserId:
        input.counterparty.linkedUserId !== undefined
          ? input.counterparty.linkedUserId
            ? new Types.ObjectId(input.counterparty.linkedUserId)
            : null
          : (debt.counterparty.linkedUserId ?? null),
    };
  }

  if (input.principal !== undefined) {
    const settled = debt.settledAmount ?? 0;
    if (input.principal + 0.001 < settled) {
      throw new BadRequestError(
        `Principal cannot be less than Rs. ${settled} already settled. Undo settlements first.`
      );
    }
    update.principal = input.principal;
    update.status =
      settled >= input.principal ? "settled" : settled > 0 ? "partially_settled" : "open";
  }

  if (input.date !== undefined) update.date = new Date(input.date);
  if (input.dueDate !== undefined) {
    update.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.note !== undefined) update.note = input.note.trim();

  const updated = await duesRepository.updateDebt(debtId, userId, update);
  if (!updated) {
    throw new NotFoundError("Due");
  }

  // The due is the source of truth for its opening ledger entry. Settlement
  // entries are not touched here; they are corrected by undoing a settlement.
  if (debt.transactionId) {
    const linked = await TransactionModel.findOne({
      _id: debt.transactionId,
      source: "dues",
    });

    if (linked) {
      const name = updated.counterparty.name;
      const defaultNote =
        updated.direction === "lent" ? `Lent to ${name}` : `Borrowed from ${name}`;
      const nameChanged =
        Boolean(input.counterparty) &&
        input.counterparty!.name.trim() !== debt.counterparty.name;

      const txnUpdate: Record<string, unknown> = {
        amount: updated.principal,
        date: updated.date,
      };

      if (input.paymentMethod !== undefined) {
        txnUpdate.paymentMethod = input.paymentMethod;
      }
      if (input.note !== undefined || nameChanged) {
        txnUpdate.note = updated.note || defaultNote;
      }

      await TransactionModel.updateOne({ _id: linked._id }, { $set: txnUpdate });
    } else {
      logger.warn(
        { debtId, transactionId: String(debt.transactionId) },
        "Opening transaction missing while updating due"
      );
    }
  }

  const settlements = await duesRepository.findSettlementsByDebt(debtId);
  await invalidateDuesDashboards(userId, updated.spaceId);

  return toDebtDto(updated, settlements);
}

export async function settleDue(
  userId: Types.ObjectId,
  debtId: string,
  input: DebtSettlementInput
): Promise<{ settlement: DebtSettlement; debt: Debt }> {
  const debt = await duesRepository.findDebtById(debtId, userId);
  if (!debt) {
    throw new NotFoundError("Due");
  }

  if (debt.status === "settled") {
    throw new ConflictError("This due is already fully settled");
  }

  const remaining = Math.round((debt.principal - debt.settledAmount) * 100) / 100;
  if (input.amount > remaining + 0.001) {
    throw new BadRequestError(
      `Settlement amount (${input.amount}) exceeds remaining balance (${remaining})`
    );
  }

  const settleDate = new Date(input.date);
  const isLent = debt.direction === "lent";
  const user = await getUserContext(userId);

  // Auto-create linked ledger transaction:
  // When 'lent' is settled -> cash returns (income)
  // When 'borrowed' is settled -> cash leaves (expense)
  const txnType = isLent ? "income" : "expense";
  const txnCategory = isLent ? "Due received" : "Due paid";
  const defaultNote = isLent
    ? `Settlement from ${debt.counterparty.name}`
    : `Settlement to ${debt.counterparty.name}`;

  const transaction = await TransactionModel.create({
    spaceId: debt.spaceId,
    type: txnType,
    category: txnCategory,
    amount: input.amount,
    date: settleDate,
    paymentMethod: input.paymentMethod ?? null,
    note: input.note?.trim() || defaultNote,
    source: "dues",
    dueId: debt._id,
    createdBy: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      username: user.username,
    },
  });

  const settlementDoc = await duesRepository.createSettlement({
    debtId: debt._id,
    userId,
    spaceId: debt.spaceId,
    amount: input.amount,
    date: settleDate,
    paymentMethod: input.paymentMethod ?? null,
    note: input.note?.trim() || "",
    transactionId: transaction._id,
  });

  const settlements = await duesRepository.findSettlementsByDebt(debt._id);
  const newSettledAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  const roundedSettled = Math.round(newSettledAmount * 100) / 100;

  const newStatus: DebtStatus =
    roundedSettled >= debt.principal ? "settled" : "partially_settled";

  const updatedDebt = await duesRepository.updateDebt(debt._id, userId, {
    settledAmount: roundedSettled,
    status: newStatus,
  });

  await invalidateDuesDashboards(userId, debt.spaceId);

  return {
    settlement: toSettlementDto(settlementDoc),
    debt: toDebtDto(updatedDebt ?? debt, settlements),
  };
}

export async function undoSettlement(
  userId: Types.ObjectId,
  debtId: string,
  settlementId: string
): Promise<Debt> {
  const debt = await duesRepository.findDebtById(debtId, userId);
  if (!debt) {
    throw new NotFoundError("Due");
  }

  const settlement = await duesRepository.findSettlementById(
    settlementId,
    debtId,
    userId
  );
  if (!settlement) {
    throw new NotFoundError("Settlement");
  }

  // Delete linked transaction if exists
  if (settlement.transactionId) {
    await TransactionModel.deleteOne({ _id: settlement.transactionId });
  }

  // Delete settlement
  await duesRepository.deleteSettlement(settlementId, debtId, userId);

  // Recalculate settlements
  const remainingSettlements = await duesRepository.findSettlementsByDebt(debtId);
  const newSettledAmount = remainingSettlements.reduce((sum, s) => sum + s.amount, 0);
  const roundedSettled = Math.round(newSettledAmount * 100) / 100;

  let newStatus: DebtStatus = "open";
  if (roundedSettled >= debt.principal) {
    newStatus = "settled";
  } else if (roundedSettled > 0) {
    newStatus = "partially_settled";
  }

  const updatedDebt = await duesRepository.updateDebt(debtId, userId, {
    settledAmount: roundedSettled,
    status: newStatus,
  });

  await invalidateDuesDashboards(userId, debt.spaceId);

  return toDebtDto(updatedDebt ?? debt, remainingSettlements);
}

export async function deleteDue(
  userId: Types.ObjectId,
  debtId: string
): Promise<{ id: string; deletedSettlements: number; deletedTransactions: number }> {
  const debt = await duesRepository.findDebtById(debtId, userId);
  if (!debt) {
    throw new NotFoundError("Due");
  }

  const settlements = await duesRepository.findSettlementsByDebt(debtId);
  const transactionIds = [
    ...new Set(
      [debt.transactionId, ...settlements.map((settlement) => settlement.transactionId)]
        .filter((id): id is Types.ObjectId => Boolean(id))
        .map((id) => String(id))
    ),
  ];

  // Document rows go first: if the ledger cleanup then fails, the remaining
  // transactions are still visible for the user to remove by hand.
  const deletedSettlements = await duesRepository.deleteSettlementsByDebt(debtId);
  await duesRepository.deleteDebt(debtId, userId);

  let deletedTransactions = 0;
  if (transactionIds.length > 0) {
    const result = await TransactionModel.deleteMany({ _id: { $in: transactionIds } });
    deletedTransactions = result.deletedCount ?? 0;
  }

  await invalidateDuesDashboards(userId, debt.spaceId);

  return {
    id: debtId,
    deletedSettlements,
    deletedTransactions,
  };
}

export async function getDuesSummary(userId: Types.ObjectId): Promise<DuesSummary> {
  return duesRepository.getDuesSummary(userId);
}
