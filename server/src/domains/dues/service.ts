import { Types } from "mongoose";

import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/index.js";
import { TransactionModel } from "../transactions/model.js";
import { getUserContext } from "../transactions/user-context.js";
import * as spaceRepository from "../spaces/repository.js";
import * as duesRepository from "./repository.js";
import type { DebtDoc, DebtSettlementDoc } from "./model.js";
import type {
  Debt,
  DebtCreateInput,
  DebtSettlement,
  DebtSettlementInput,
  DebtStatus,
  DuesQuery,
  DuesSummary,
  PaginatedResult,
} from "../../shared/index.js";

function toDebtDto(doc: DebtDoc, settlements?: DebtSettlementDoc[]): Debt {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    spaceId: String(doc.spaceId),
    direction: doc.direction,
    counterparty: {
      name: doc.counterparty.name,
      phone: doc.counterparty.phone ?? undefined,
      linkedUserId: doc.counterparty.linkedUserId ? String(doc.counterparty.linkedUserId) : null,
    },
    principal: doc.principal,
    date: doc.date.toISOString(),
    dueDate: doc.dueDate ? doc.dueDate.toISOString() : null,
    note: doc.note ?? "",
    transactionId: doc.transactionId ? String(doc.transactionId) : undefined,
    status: doc.status,
    settledAmount: doc.settledAmount ?? 0,
    settlements: settlements ? settlements.map(toSettlementDto) : undefined,
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

export async function getDue(
  userId: Types.ObjectId,
  debtId: string
): Promise<Debt> {
  const debt = await duesRepository.findDebtById(debtId, userId);
  if (!debt) {
    throw new NotFoundError("Due");
  }

  const settlements = await duesRepository.findSettlementsByDebt(debtId);
  return toDebtDto(debt, settlements);
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

  return toDebtDto(updatedDebt ?? debt, remainingSettlements);
}

export async function deleteDue(
  userId: Types.ObjectId,
  debtId: string
): Promise<{ id: string }> {
  const debt = await duesRepository.findDebtById(debtId, userId);
  if (!debt) {
    throw new NotFoundError("Due");
  }

  const settlements = await duesRepository.findSettlementsByDebt(debtId);
  if (settlements.length > 0 || (debt.settledAmount ?? 0) > 0) {
    throw new ConflictError(
      "Cannot delete a due that has recorded settlements. Undo settlements first."
    );
  }

  // Delete linked lending transaction
  if (debt.transactionId) {
    await TransactionModel.deleteOne({ _id: debt.transactionId });
  }

  await duesRepository.deleteDebt(debtId, userId);

  return { id: debtId };
}

export async function getDuesSummary(userId: Types.ObjectId): Promise<DuesSummary> {
  return duesRepository.getDuesSummary(userId);
}
