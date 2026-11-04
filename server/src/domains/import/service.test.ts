import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SpaceModel } from "../spaces/model.js";
import * as spaceRepository from "../spaces/repository.js";
import { TransactionModel } from "../transactions/model.js";
import { UserModel } from "../users/model.js";
import { importTransactions } from "./service.js";

const TEST_URI = process.env.MONGODB_TEST_URI ?? "mongodb://localhost:27017/ledg_test";

function row(overrides: Record<string, unknown> = {}) {
  return {
    category: "Food",
    type: "expense",
    amount: 250,
    note: "Lunch",
    date: "2026-11-02T06:00:00.000Z",
    paymentMethod: "cash",
    ...overrides,
  };
}

describe("importTransactions", () => {
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
    ]);

    const user = await UserModel.create({
      email: "import@example.com",
      name: "Import User",
      fullName: "Import User",
    });
    userId = user._id;

    const space = await spaceRepository.createSpace(
      {
        userId,
        email: "import@example.com",
        name: "Import User",
        username: null,
      },
      { name: "Personal", type: "personal" }
    );
    spaceId = String(space.id);
  });

  it("imports rows into the target space and stamps createdBy", async () => {
    const result = await importTransactions(userId, {
      targetSpaceId: spaceId,
      createSpaces: false,
      skipDuplicates: true,
      transactions: [
        row(),
        row({
          category: "Salary",
          type: "income",
          amount: 5000,
          note: "",
          date: "2026-11-01T06:00:00.000Z",
        }),
      ],
    });

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);

    const count = await TransactionModel.countDocuments({
      spaceId: new Types.ObjectId(spaceId),
    });
    expect(count).toBe(2);

    const saved = await TransactionModel.findOne({ category: "Food" }).lean();
    expect(saved?.createdBy?.email).toBe("import@example.com");
    expect(saved?.source).toBe("manual");
  });

  it("skips rows that match an existing transaction", async () => {
    const input = {
      targetSpaceId: spaceId,
      createSpaces: false,
      skipDuplicates: true,
      transactions: [row()],
    };

    expect((await importTransactions(userId, input)).imported).toBe(1);

    const second = await importTransactions(userId, input);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.failed).toBe(0);
  });

  it("imports duplicates when skipDuplicates is off", async () => {
    const input = {
      targetSpaceId: spaceId,
      createSpaces: false,
      skipDuplicates: false,
      transactions: [row()],
    };

    await importTransactions(userId, input);
    const second = await importTransactions(userId, input);

    expect(second.imported).toBe(1);
    expect(second.skipped).toBe(0);
    expect(
      await TransactionModel.countDocuments({
        spaceId: new Types.ObjectId(spaceId),
      })
    ).toBe(2);
  });

  it("creates a missing space named in the file", async () => {
    const result = await importTransactions(userId, {
      createSpaces: true,
      skipDuplicates: false,
      transactions: [row({ spaceName: "Trip", category: "Travel", note: "Taxi" })],
    });

    expect(result.imported).toBe(1);
    expect(result.spacesCreated).toBe(1);

    const space = await SpaceModel.findOne({ name: "Trip" }).lean();
    expect(space).toBeTruthy();
    expect(await TransactionModel.countDocuments({ spaceId: space!._id })).toBe(1);
  });

  it("falls back to spaceName when a backup's spaceId is stale", async () => {
    const staleId = new Types.ObjectId().toString();

    const result = await importTransactions(userId, {
      createSpaces: false,
      skipDuplicates: false,
      transactions: [row({ spaceId: staleId, spaceName: "Personal" })],
    });

    expect(result.imported).toBe(1);
    expect(
      await TransactionModel.countDocuments({
        spaceId: new Types.ObjectId(spaceId),
      })
    ).toBe(1);
  });

  it("rejects bad rows individually without failing the file", async () => {
    const result = await importTransactions(userId, {
      targetSpaceId: spaceId,
      createSpaces: false,
      skipDuplicates: false,
      transactions: [row(), row({ type: "not-a-type" }), row({ amount: -5 })],
    });

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].index).toBe(1);
  });
});
