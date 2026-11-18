import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BadRequestError, ConflictError } from "../../common/errors/index.js";
import { SpaceModel } from "../spaces/model.js";
import * as spaceRepository from "../spaces/repository.js";
import { DebtModel, DebtSettlementModel } from "./model.js";
import { TransactionModel } from "../transactions/model.js";
import * as transactionService from "../transactions/service.js";
import { UserModel } from "../users/model.js";
import {
  createDue,
  deleteDue,
  getDue,
  getDuesSummary,
  settleDue,
  updateDue,
} from "./service.js";

const TEST_URI = process.env.MONGODB_TEST_URI ?? "mongodb://localhost:27017/ledg_test";

describe("dues service", () => {
  let userId: Types.ObjectId;
  let spaceId: string;

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
    await mongoose.connection.db?.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      SpaceModel.deleteMany({}),
      TransactionModel.deleteMany({}),
      DebtModel.deleteMany({}),
      DebtSettlementModel.deleteMany({}),
    ]);

    const user = await UserModel.create({
      email: "dues@example.com",
      name: "Dues User",
      fullName: "Dues User",
    });
    userId = user._id as Types.ObjectId;

    const space = await spaceRepository.createSpace(
      {
        userId,
        email: "dues@example.com",
        name: "Dues User",
        username: null,
      },
      { name: "Personal", type: "personal" }
    );
    spaceId = String(space.id);
  });

  function dueInput(overrides: Record<string, unknown> = {}) {
    return {
      direction: "lent" as const,
      counterparty: { name: "Sam", phone: "9800000000" },
      principal: 1000,
      date: "2026-11-01T06:00:00.000Z",
      dueDate: "2026-11-20T06:00:00.000Z",
      note: "Lunch",
      paymentMethod: "cash" as const,
      ...overrides,
    };
  }

  async function createTestDue(overrides: Record<string, unknown> = {}) {
    return createDue(userId, dueInput(overrides));
  }

  it("stamps the opening transaction with dueId", async () => {
    const due = await createTestDue();
    const txn = await TransactionModel.findById(due.transactionId).lean();

    expect(txn).not.toBeNull();
    expect(String(txn?.dueId)).toBe(due.id);
    expect(txn?.source).toBe("dues");
  });

  it("stamps settlement transactions with dueId", async () => {
    const due = await createTestDue();

    await settleDue(userId, due.id, {
      amount: 200,
      date: "2026-11-05T06:00:00.000Z",
      paymentMethod: "cash",
      note: "",
    });

    const transactions = await TransactionModel.find({
      spaceId: new Types.ObjectId(spaceId),
      source: "dues",
    }).lean();

    expect(transactions).toHaveLength(2);
    expect(transactions.every((txn) => String(txn.dueId) === due.id)).toBe(true);
  });

  it("edits a due and keeps the opening transaction in sync", async () => {
    const due = await createTestDue();

    const updated = await updateDue(userId, due.id, {
      counterparty: { name: "Sam Lee", phone: "9812345678" },
      principal: 800,
      date: "2026-11-02T06:00:00.000Z",
      dueDate: null,
      note: "Dinner",
      paymentMethod: "card",
    });

    expect(updated.counterparty.name).toBe("Sam Lee");
    expect(updated.counterparty.phone).toBe("9812345678");
    expect(updated.principal).toBe(800);
    expect(updated.dueDate).toBeNull();
    expect(updated.note).toBe("Dinner");

    const txn = await TransactionModel.findById(due.transactionId).lean();
    expect(txn?.amount).toBe(800);
    expect(txn?.paymentMethod).toBe("card");
    expect(txn?.note).toBe("Dinner");
    expect(txn?.date.toISOString()).toBe("2026-11-02T06:00:00.000Z");
  });

  it("updates the generated note when the person changes and no note was set", async () => {
    const due = await createTestDue({ note: "" });

    await updateDue(userId, due.id, {
      counterparty: { name: "Samuel", phone: "9800000000" },
    });

    const txn = await TransactionModel.findById(due.transactionId).lean();
    expect(txn?.note).toBe("Lent to Samuel");
  });

  it("rejects a principal below the settled amount", async () => {
    const due = await createTestDue();
    await settleDue(userId, due.id, {
      amount: 300,
      date: "2026-11-05T06:00:00.000Z",
      note: "",
    });

    await expect(updateDue(userId, due.id, { principal: 200 })).rejects.toBeInstanceOf(
      BadRequestError
    );

    const stored = await DebtModel.findById(due.id).lean();
    expect(stored?.principal).toBe(1000);

    const txn = await TransactionModel.findById(due.transactionId).lean();
    expect(txn?.amount).toBe(1000);
  });

  it("marks the due settled when the principal equals the settled amount", async () => {
    const due = await createTestDue();
    await settleDue(userId, due.id, {
      amount: 300,
      date: "2026-11-05T06:00:00.000Z",
      note: "",
    });

    const updated = await updateDue(userId, due.id, { principal: 300 });

    expect(updated.principal).toBe(300);
    expect(updated.status).toBe("settled");
    expect(updated.settledAmount).toBe(300);
  });

  it("keeps the due partially settled when the principal stays above it", async () => {
    const due = await createTestDue();
    await settleDue(userId, due.id, {
      amount: 300,
      date: "2026-11-05T06:00:00.000Z",
      note: "",
    });

    const updated = await updateDue(userId, due.id, { principal: 700 });

    expect(updated.status).toBe("partially_settled");
    expect(updated.settledAmount).toBe(300);
  });

  it("returns opening and settlement entries in timeline order", async () => {
    const due = await createTestDue();
    const first = await settleDue(userId, due.id, {
      amount: 200,
      date: "2026-11-05T06:00:00.000Z",
      note: "",
    });
    const second = await settleDue(userId, due.id, {
      amount: 300,
      date: "2026-11-06T06:00:00.000Z",
      note: "",
    });

    const full = await getDue(userId, due.id);
    const ids = full.linkedTransactions?.map((txn) => txn.id) ?? [];

    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe(due.transactionId);
    expect(ids.slice(1)).toEqual([
      second.settlement.transactionId,
      first.settlement.transactionId,
    ]);
  });

  it("deletes a partially settled due with every linked ledger entry", async () => {
    const due = await createTestDue();
    await settleDue(userId, due.id, {
      amount: 200,
      date: "2026-11-05T06:00:00.000Z",
      note: "",
    });
    await settleDue(userId, due.id, {
      amount: 300,
      date: "2026-11-06T06:00:00.000Z",
      note: "",
    });

    const unrelated = await TransactionModel.create({
      spaceId: new Types.ObjectId(spaceId),
      category: "Food",
      type: "expense",
      amount: 50,
      note: "Snack",
      date: new Date("2026-11-04T06:00:00.000Z"),
      paymentMethod: "cash",
      source: "manual",
      createdBy: {
        userId,
        name: "Dues User",
        email: "dues@example.com",
        username: null,
      },
    });

    const result = await deleteDue(userId, due.id);

    expect(result).toEqual({
      id: due.id,
      deletedSettlements: 2,
      deletedTransactions: 3,
    });

    expect(await DebtModel.findById(due.id).lean()).toBeNull();
    expect(await DebtSettlementModel.countDocuments({ debtId: due.id })).toBe(0);
    expect(
      await TransactionModel.countDocuments({ dueId: new Types.ObjectId(due.id) })
    ).toBe(0);
    expect(await TransactionModel.findById(unrelated._id).lean()).not.toBeNull();
  });

  it("blocks editing a dues-sourced transaction", async () => {
    const due = await createTestDue();

    await expect(
      transactionService.updateUserTransaction(userId, spaceId, due.transactionId!, {
        amount: 1,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  describe("person grouping", () => {
    it("separates same-name people by phone and merges formatted phones", async () => {
      await createTestDue({
        counterparty: { name: "Anita", phone: "9800000001" },
      });
      await createTestDue({
        counterparty: { name: "Anita", phone: "9800000002" },
      });
      await createTestDue({
        counterparty: { name: "Bob", phone: "980-000-0003" },
        direction: "borrowed",
        principal: 50,
      });
      await createTestDue({
        counterparty: { name: "Bob", phone: "9800000003" },
        direction: "borrowed",
        principal: 25,
      });

      const summary = await getDuesSummary(userId);
      const anitas = summary.byPerson.filter((person) => person.name === "Anita");
      const bobs = summary.byPerson.filter((person) => person.name === "Bob");

      expect(anitas).toHaveLength(2);
      expect(anitas.map((person) => person.key).sort()).toEqual([
        "phone:9800000001",
        "phone:9800000002",
      ]);
      expect(bobs).toHaveLength(1);
      expect(bobs[0].key).toBe("phone:9800000003");
      expect(bobs[0].iOwe).toBe(75);
    });

    it("falls back to a normalized name when no phone is set", async () => {
      await createTestDue({
        counterparty: { name: "carol singh" },
        direction: "borrowed",
        principal: 40,
      });
      await createTestDue({
        counterparty: { name: "  Carol   Singh  " },
        principal: 100,
      });

      const summary = await getDuesSummary(userId);
      const carol = summary.byPerson.find((person) => person.key === "name:carol singh");

      expect(summary.byPerson).toHaveLength(1);
      expect(carol?.name).toBe("Carol Singh");
      expect(carol?.owedToMe).toBe(100);
      expect(carol?.iOwe).toBe(40);
    });

    it("groups by linked user even when the display name changes", async () => {
      const linkedUserId = new Types.ObjectId().toString();

      await createTestDue({
        counterparty: { name: "Dave", linkedUserId },
        principal: 100,
      });
      await createTestDue({
        counterparty: { name: "David", linkedUserId },
        direction: "borrowed",
        principal: 30,
      });

      const summary = await getDuesSummary(userId);
      const group = summary.byPerson.find(
        (person) => person.key === `user:${linkedUserId}`
      );

      expect(summary.byPerson).toHaveLength(1);
      expect(group?.linkedUserId).toBe(linkedUserId);
      expect(group?.owedToMe).toBe(100);
      expect(group?.iOwe).toBe(30);
    });
  });
});
