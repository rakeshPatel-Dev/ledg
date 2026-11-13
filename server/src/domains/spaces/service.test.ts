import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError, NotFoundError } from "../../common/errors/index.js";
import { DebtModel, DebtSettlementModel } from "../dues/model.js";
import { SpaceInvitationModel } from "../invitations/model.js";
import { NotificationModel } from "../notifications/model.js";
import { TransactionModel } from "../transactions/model.js";
import { UserModel } from "../users/model.js";
import { SpaceModel, type SpaceMemberDoc } from "./model.js";
import { deleteUserSpace } from "./service.js";

const TEST_URI = process.env.MONGODB_TEST_URI ?? "mongodb://localhost:27017/ledg_test";

interface Fixture {
  ownerId: Types.ObjectId;
  memberId: Types.ObjectId;
  spaceId: Types.ObjectId;
  transactionId: Types.ObjectId;
  debtId: Types.ObjectId;
  settlementId: Types.ObjectId;
  invitationId: Types.ObjectId;
  oldNotificationId: Types.ObjectId;
}

async function createUser(email: string, name: string) {
  const user = await UserModel.create({ email, name, fullName: name });
  return user._id as Types.ObjectId;
}

async function createTransaction(spaceId: Types.ObjectId, userId: Types.ObjectId) {
  return TransactionModel.create({
    spaceId,
    category: "Food",
    type: "expense",
    amount: 500,
    note: "Dinner",
    date: new Date("2026-11-02T06:00:00.000Z"),
    paymentMethod: "cash",
    source: "manual",
    createdBy: {
      userId,
      name: "Owner",
      email: "owner@example.com",
      username: null,
    },
  });
}

async function seed(shared: boolean): Promise<Fixture> {
  const ownerId = await createUser("owner@example.com", "Owner");
  const memberId = await createUser("member@example.com", "Member");

  const members: SpaceMemberDoc[] = [
    {
      userId: ownerId,
      email: "owner@example.com",
      name: "Owner",
      username: null,
      role: "owner",
      joinedAt: new Date(),
    },
  ];

  if (shared) {
    members.push({
      userId: memberId,
      email: "member@example.com",
      name: "Member",
      username: null,
      role: "member",
      joinedAt: new Date(),
    });
  }

  const space = await SpaceModel.create({
    ownerId,
    name: "Household",
    type: shared ? "family" : "personal",
    isShared: shared,
    members,
  });

  const transaction = await createTransaction(space._id, ownerId);

  const debt = await DebtModel.create({
    userId: ownerId,
    spaceId: space._id,
    direction: "lent",
    counterparty: { name: "Sam", phone: "9800000000" },
    principal: 500,
    date: new Date("2026-11-03T06:00:00.000Z"),
    note: "Dinner",
    transactionId: transaction._id,
    status: "partially_settled",
    settledAmount: 200,
  });

  const settlement = await DebtSettlementModel.create({
    debtId: debt._id,
    userId: ownerId,
    spaceId: space._id,
    amount: 200,
    date: new Date("2026-11-05T06:00:00.000Z"),
    paymentMethod: "cash",
    note: "",
  });

  const invitation = await SpaceInvitationModel.create({
    spaceId: space._id,
    spaceName: space.name,
    inviterId: ownerId,
    inviterName: "Owner",
    inviterEmail: "owner@example.com",
    inviteeEmail: "invitee@example.com",
    role: "member",
    status: "pending",
    tokenHash: "hashed-token",
    expiresAt: new Date("2026-12-01T00:00:00.000Z"),
  });

  const oldNotification = await NotificationModel.create({
    userId: memberId,
    type: "transaction_added",
    title: "Transaction Added",
    message: "A transaction was added to Household",
    read: false,
    data: { spaceId: String(space._id), spaceName: space.name },
  });

  return {
    ownerId,
    memberId,
    spaceId: space._id,
    transactionId: transaction._id,
    debtId: debt._id,
    settlementId: settlement._id,
    invitationId: invitation._id,
    oldNotificationId: oldNotification._id,
  };
}

describe("deleteUserSpace", () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
    await mongoose.connection.db?.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      UserModel.deleteMany({}),
      SpaceModel.deleteMany({}),
      TransactionModel.deleteMany({}),
      DebtModel.deleteMany({}),
      DebtSettlementModel.deleteMany({}),
      SpaceInvitationModel.deleteMany({}),
      NotificationModel.deleteMany({}),
    ]);
  });

  it("rejects a mismatched confirm name and deletes nothing", async () => {
    const fixture = await seed(true);

    await expect(
      deleteUserSpace(fixture.ownerId, String(fixture.spaceId), "Wrong name")
    ).rejects.toBeInstanceOf(BadRequestError);

    const space = await SpaceModel.findById(fixture.spaceId).lean();
    expect(space).not.toBeNull();
    expect(space?.status).toBe("active");
    expect(await TransactionModel.countDocuments({ spaceId: fixture.spaceId })).toBe(1);
    expect(await DebtModel.countDocuments({ spaceId: fixture.spaceId })).toBe(1);
    expect(await DebtSettlementModel.countDocuments({ spaceId: fixture.spaceId })).toBe(
      1
    );
  });

  it("cascades transactions, dues, settlements and invitations for a shared space", async () => {
    const fixture = await seed(true);

    const result = await deleteUserSpace(
      fixture.ownerId,
      String(fixture.spaceId),
      " household "
    );

    expect(result).toMatchObject({
      id: String(fixture.spaceId),
      deletedTransactions: 1,
      deletedDebts: 1,
      deletedSettlements: 1,
      notifiedMembers: 1,
    });

    expect(await SpaceModel.findById(fixture.spaceId).lean()).toBeNull();
    expect(await TransactionModel.countDocuments({ spaceId: fixture.spaceId })).toBe(0);
    expect(await DebtModel.countDocuments({ spaceId: fixture.spaceId })).toBe(0);
    expect(await DebtSettlementModel.countDocuments({ spaceId: fixture.spaceId })).toBe(
      0
    );

    const invitation = await SpaceInvitationModel.findById(fixture.invitationId).lean();
    expect(invitation?.status).toBe("canceled");
    expect(invitation?.tokenHash ?? null).toBeNull();

    // The old space notification is removed, not left pointing at a dead space.
    expect(
      await NotificationModel.countDocuments({ _id: fixture.oldNotificationId })
    ).toBe(0);

    const memberNotifications = await NotificationModel.find({
      userId: fixture.memberId,
    }).lean();
    expect(memberNotifications).toHaveLength(1);
    expect(memberNotifications[0].type).toBe("space_deleted");
    expect(memberNotifications[0].data.spaceId).toBe(String(fixture.spaceId));

    // The owner deleted the space; they do not need a "space deleted" message.
    expect(
      await NotificationModel.countDocuments({
        userId: fixture.ownerId,
        type: "space_deleted",
      })
    ).toBe(0);
  });

  it("returns 404 on a second delete", async () => {
    const fixture = await seed(true);

    await deleteUserSpace(fixture.ownerId, String(fixture.spaceId), "Household");

    await expect(
      deleteUserSpace(fixture.ownerId, String(fixture.spaceId), "Household")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("cascades a personal space without notifying anyone", async () => {
    const fixture = await seed(false);

    const result = await deleteUserSpace(
      fixture.ownerId,
      String(fixture.spaceId),
      "Household"
    );

    expect(result.notifiedMembers).toBe(0);
    expect(await SpaceModel.findById(fixture.spaceId).lean()).toBeNull();
    expect(await TransactionModel.countDocuments({ spaceId: fixture.spaceId })).toBe(0);
    expect(await DebtModel.countDocuments({ spaceId: fixture.spaceId })).toBe(0);
    expect(await DebtSettlementModel.countDocuments({ spaceId: fixture.spaceId })).toBe(
      0
    );
    expect(await NotificationModel.countDocuments({})).toBe(0);
  });

  it("still deletes the space when the notification write fails", async () => {
    const fixture = await seed(true);

    vi.spyOn(NotificationModel, "create").mockImplementationOnce(() => {
      throw new Error("notification write failed");
    });

    const result = await deleteUserSpace(
      fixture.ownerId,
      String(fixture.spaceId),
      "Household"
    );

    expect(result.notifiedMembers).toBe(1);
    expect(await SpaceModel.findById(fixture.spaceId).lean()).toBeNull();
    expect(await TransactionModel.countDocuments({ spaceId: fixture.spaceId })).toBe(0);
  });
});
