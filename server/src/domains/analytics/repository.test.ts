import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { TransactionModel } from "../transactions/model.js";
import { getAnalyticsSummaryData, getDashboardData } from "./repository.js";

const TEST_URI = process.env.MONGODB_TEST_URI ?? "mongodb://localhost:27017/ledg_test";

const spaceId = new Types.ObjectId();
const otherSpaceId = new Types.ObjectId();
const userId = new Types.ObjectId();

const createdBy = {
  userId,
  name: "Test User",
  email: "test@example.com",
};

function tx(overrides: Record<string, unknown> = {}) {
  return {
    spaceId,
    category: "Food",
    type: "expense",
    amount: 100,
    note: "",
    date: new Date("2026-11-02T06:00:00.000Z"),
    paymentMethod: "cash",
    source: "manual",
    createdBy,
    ...overrides,
  };
}

const CURRENT_RANGE = {
  from: new Date("2026-11-01T18:15:00.000Z"),
  to: new Date("2026-11-30T18:14:59.999Z"),
};
const PREVIOUS_RANGE = {
  from: new Date("2026-10-01T18:15:00.000Z"),
  to: new Date("2026-10-31T18:14:59.999Z"),
};

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await mongoose.connection.db?.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await TransactionModel.deleteMany({});
});

describe("getAnalyticsSummaryData", () => {
  it("computes totals, payment methods, and trend buckets in one pipeline", async () => {
    await TransactionModel.insertMany([
      tx({
        type: "income",
        category: "Salary",
        amount: 5000,
        paymentMethod: "bank_transfer",
        date: new Date("2026-11-02T06:00:00.000Z"),
      }),
      tx({
        amount: 1200,
        category: "Food",
        paymentMethod: "card",
        date: new Date("2026-11-02T07:00:00.000Z"),
      }),
      tx({
        amount: 800,
        category: "Food",
        paymentMethod: "cash",
        date: new Date("2026-11-03T07:00:00.000Z"),
      }),
      // Outside the current range.
      tx({ amount: 999, date: new Date("2026-10-15T07:00:00.000Z") }),
      // Dues are loan movements: excluded from P&L totals and breakdowns,
      // but still counted as transactions.
      tx({
        amount: 300,
        source: "dues",
        paymentMethod: "cash",
        date: new Date("2026-11-03T08:00:00.000Z"),
      }),
      // Another space must never leak in.
      tx({
        spaceId: otherSpaceId,
        amount: 777,
        date: new Date("2026-11-02T09:00:00.000Z"),
      }),
    ]);

    const data = await getAnalyticsSummaryData(
      [spaceId],
      CURRENT_RANGE,
      PREVIOUS_RANGE,
      "day"
    );

    expect(data.current.totalIncome).toBe(5000);
    expect(data.current.totalExpense).toBe(2000);
    expect(data.current.count).toBe(4);

    expect(data.previous.totalExpense).toBe(999);
    expect(data.previous.totalIncome).toBe(0);

    expect(data.currentExpenseCategories).toEqual([
      { category: "Food", amount: 2000, count: 2 },
    ]);

    expect(data.paymentMethods).toEqual([
      { method: "card", amount: 1200, count: 1 },
      { method: "cash", amount: 800, count: 1 },
    ]);

    expect(data.trend).toEqual([
      { key: "2026-11-02", income: 5000, expense: 1200 },
      { key: "2026-11-03", income: 0, expense: 800 },
    ]);
  });

  it("groups trend points by month when asked", async () => {
    await TransactionModel.insertMany([
      tx({ amount: 100, date: new Date("2026-11-02T06:00:00.000Z") }),
      tx({ amount: 250, date: new Date("2026-11-20T06:00:00.000Z") }),
      tx({ amount: 400, date: new Date("2026-12-05T06:00:00.000Z") }),
    ]);

    const data = await getAnalyticsSummaryData(
      [spaceId],
      { from: new Date("2026-11-01T18:15:00.000Z") },
      {},
      "month"
    );

    expect(data.trend).toEqual([
      { key: "2026-11", income: 0, expense: 350 },
      { key: "2026-12", income: 0, expense: 400 },
    ]);
  });
});

describe("getDashboardData", () => {
  it("excludes dues from totals and keeps them in recent activity", async () => {
    await TransactionModel.insertMany([
      tx({
        type: "income",
        category: "Salary",
        amount: 5000,
        paymentMethod: "bank_transfer",
        date: new Date("2026-11-02T06:00:00.000Z"),
      }),
      tx({
        amount: 1200,
        category: "Food",
        paymentMethod: "card",
        date: new Date("2026-11-02T07:00:00.000Z"),
      }),
      tx({
        amount: 300,
        source: "dues",
        category: "Due paid",
        paymentMethod: "cash",
        date: new Date("2026-11-03T08:00:00.000Z"),
      }),
    ]);

    const data = await getDashboardData(
      [spaceId],
      new Date("2026-11-01T00:00:00.000Z")
    );

    expect(data.allTime.totalIncome).toBe(5000);
    expect(data.allTime.totalExpense).toBe(1200);
    expect(data.month.totalIncome).toBe(5000);
    expect(data.month.totalExpense).toBe(1200);

    expect(data.expenseCategories).toEqual([
      { category: "Food", amount: 1200, count: 1 },
    ]);
    expect(data.paymentMethods).toEqual([
      { method: "card", amount: 1200, count: 1 },
    ]);

    // Loan movements stay visible in history and keep their source marker so
    // the UI can label and protect them.
    expect(data.recentTransactions).toHaveLength(3);
    expect(
      data.recentTransactions.find((t) => t.source === "dues")
    ).toMatchObject({ category: "Due paid", amount: 300 });
  });
});
