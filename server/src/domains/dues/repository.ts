import { Types } from "mongoose";

import { DebtModel, DebtSettlementModel, type DebtDoc, type DebtSettlementDoc } from "./model.js";
import type { DebtDirection, DebtStatus, DuesSummary, PersonDuesSummary } from "../../shared/index.js";

export async function createDebt(data: Partial<DebtDoc>): Promise<DebtDoc> {
  const debt = await DebtModel.create(data);
  return debt.toObject();
}

export async function findDebtById(
  debtId: string | Types.ObjectId,
  userId: Types.ObjectId
): Promise<DebtDoc | null> {
  return DebtModel.findOne({ _id: debtId, userId }).lean();
}

export interface FindDebtsOptions {
  status?: DebtStatus | "all";
  direction?: DebtDirection;
  person?: string;
  page?: number;
  pageSize?: number;
}

export async function findDebtsByUser(
  userId: Types.ObjectId,
  options: FindDebtsOptions = {}
): Promise<{ items: DebtDoc[]; total: number }> {
  const { status, direction, person, page = 1, pageSize = 20 } = options;

  const match: Record<string, unknown> = { userId };

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  if (status && status !== "all") {
    match.status = status;
  }
  if (direction) {
    match.direction = direction;
  }
  if (person) {
    match["counterparty.name"] = { $regex: escapeRegex(person.trim()), $options: "i" };
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    DebtModel.find(match).sort({ date: -1, _id: -1 }).skip(skip).limit(pageSize).lean<DebtDoc[]>(),
    DebtModel.countDocuments(match),
  ]);

  return { items, total };
}

export async function updateDebt(
  debtId: string | Types.ObjectId,
  userId: Types.ObjectId,
  update: Partial<DebtDoc>
): Promise<DebtDoc | null> {
  return DebtModel.findOneAndUpdate(
    { _id: debtId, userId },
    { $set: update },
    { new: true }
  ).lean();
}

export async function deleteDebt(
  debtId: string | Types.ObjectId,
  userId: Types.ObjectId
): Promise<boolean> {
  const result = await DebtModel.deleteOne({ _id: debtId, userId });
  return result.deletedCount === 1;
}

export async function createSettlement(
  data: Partial<DebtSettlementDoc>
): Promise<DebtSettlementDoc> {
  const settlement = await DebtSettlementModel.create(data);
  return settlement.toObject();
}

export async function findSettlementsByDebt(
  debtId: string | Types.ObjectId
): Promise<DebtSettlementDoc[]> {
  return DebtSettlementModel.find({ debtId }).sort({ date: -1, _id: -1 }).lean<DebtSettlementDoc[]>();
}

export async function findSettlementById(
  settlementId: string | Types.ObjectId,
  debtId: string | Types.ObjectId,
  userId: Types.ObjectId
): Promise<DebtSettlementDoc | null> {
  return DebtSettlementModel.findOne({ _id: settlementId, debtId, userId }).lean();
}

export async function deleteSettlement(
  settlementId: string | Types.ObjectId,
  debtId: string | Types.ObjectId,
  userId: Types.ObjectId
): Promise<boolean> {
  const result = await DebtSettlementModel.deleteOne({
    _id: settlementId,
    debtId,
    userId,
  });
  return result.deletedCount === 1;
}

export async function getDuesSummary(userId: Types.ObjectId): Promise<DuesSummary> {
  const now = new Date();

  const debts = await DebtModel.find({ userId }).lean<DebtDoc[]>();

  let owedToMe = 0;
  let iOwe = 0;
  let overdueCount = 0;
  let activeCount = 0;

  const personMap = new Map<
    string,
    { name: string; phone?: string; owedToMe: number; iOwe: number; activeCount: number }
  >();

  for (const debt of debts) {
    const isUnsettled = debt.status !== "settled";
    const remaining = Math.max(0, debt.principal - (debt.settledAmount ?? 0));
    const personName = debt.counterparty.name.trim();
    const personKey = personName.toLowerCase();

    let personEntry = personMap.get(personKey);
    if (!personEntry) {
      personEntry = {
        name: personName,
        phone: debt.counterparty.phone ?? undefined,
        owedToMe: 0,
        iOwe: 0,
        activeCount: 0,
      };
      personMap.set(personKey, personEntry);
    }
    if (debt.counterparty.phone && !personEntry.phone) {
      personEntry.phone = debt.counterparty.phone;
    }

    if (isUnsettled) {
      activeCount += 1;
      personEntry.activeCount += 1;

      if (debt.dueDate && new Date(debt.dueDate) < now) {
        overdueCount += 1;
      }

      if (debt.direction === "lent") {
        owedToMe += remaining;
        personEntry.owedToMe += remaining;
      } else {
        iOwe += remaining;
        personEntry.iOwe += remaining;
      }
    }
  }

  const byPerson: PersonDuesSummary[] = Array.from(personMap.values())
    .map((p) => ({
      name: p.name,
      phone: p.phone,
      owedToMe: Math.round(p.owedToMe * 100) / 100,
      iOwe: Math.round(p.iOwe * 100) / 100,
      net: Math.round((p.owedToMe - p.iOwe) * 100) / 100,
      activeCount: p.activeCount,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || b.activeCount - a.activeCount);

  return {
    owedToMe: Math.round(owedToMe * 100) / 100,
    iOwe: Math.round(iOwe * 100) / 100,
    net: Math.round((owedToMe - iOwe) * 100) / 100,
    overdueCount,
    activeCount,
    byPerson,
  };
}
