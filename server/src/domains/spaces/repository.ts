import { Types } from "mongoose";

import { SpaceModel, type SpaceDoc, type SpaceMemberDoc } from "./model.js";
import { TransactionModel } from "../transactions/model.js";
import { SpaceInvitationModel } from "../invitations/model.js";
import { NotificationModel } from "../notifications/model.js";

export interface CreateSpaceParams {
  name: string;
  type: string;
  monthlyBudget?: number | null;
}

export interface OwnerUserInfo {
  userId: Types.ObjectId;
  email: string;
  name: string;
  username?: string | null;
}

export async function createSpace(
  owner: OwnerUserInfo,
  data: CreateSpaceParams
): Promise<SpaceDoc> {
  const initialMembers: SpaceMemberDoc[] = [
    {
      userId: owner.userId,
      email: owner.email.toLowerCase(),
      name: owner.name,
      username: owner.username ?? null,
      role: "owner",
      joinedAt: new Date(),
    },
  ];

  const doc = await SpaceModel.create({
    ownerId: owner.userId,
    name: data.name,
    type: data.type,
    monthlyBudget: data.monthlyBudget ?? null,
    isShared: false,
    members: initialMembers,
    status: "active",
  });

  return toSpaceDto(doc.toObject(), "owner");
}

export async function findSpacesForUser(
  userId: Types.ObjectId
): Promise<SpaceDoc[]> {
  const docs = await SpaceModel.find({
    status: { $ne: "deleting" },
    $or: [{ ownerId: userId }, { "members.userId": userId }],
  })
    .sort({ createdAt: -1 })
    .lean();

  return docs.map((doc) => {
    const role = doc.ownerId.toString() === userId.toString() ? "owner" : "member";
    return toSpaceDto(doc, role);
  });
}

export async function findSpacesByOwner(
  ownerId: Types.ObjectId
): Promise<SpaceDoc[]> {
  const docs = await SpaceModel.find({ ownerId, status: { $ne: "deleting" } })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((doc) => toSpaceDto(doc, "owner"));
}

export async function findSpaceById(
  id: string,
  ownerId?: Types.ObjectId
): Promise<SpaceDoc | null> {
  const query: Record<string, unknown> = { _id: id, status: { $ne: "deleting" } };
  if (ownerId) query.ownerId = ownerId;

  const doc = await SpaceModel.findOne(query).lean();
  if (!doc) return null;
  // Derive the role from the document itself, so a caller that omits
  // ownerId never silently receives "member" when they actually own it.
  const role: "owner" | "member" =
    doc.ownerId.toString() === (ownerId?.toString() ?? "") ? "owner" : "member";
  return toSpaceDto(doc, role);

}

export async function updateSpace(
  id: string,
  ownerId: Types.ObjectId,
  data: Record<string, unknown>
): Promise<SpaceDoc | null> {
  const doc = await SpaceModel.findOneAndUpdate(
    { _id: id, ownerId, status: { $ne: "deleting" } },
    { $set: data },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).lean();
  return doc ? toSpaceDto(doc, "owner") : null;
}

export async function setSpaceDeletingLease(
  id: string,
  ownerId: Types.ObjectId
): Promise<SpaceDoc | null> {
  const doc = await SpaceModel.findOneAndUpdate(
    { _id: id, ownerId },
    { $set: { status: "deleting", deletingAt: new Date() } },
    { returnDocument: "after" }
  ).lean();
  return doc ? toSpaceDto(doc, "owner") : null;
}

export async function clearSpaceDeletingLease(
  id: string,
  ownerId: Types.ObjectId
): Promise<SpaceDoc | null> {
  const doc = await SpaceModel.findOneAndUpdate(
    { _id: id, ownerId, status: "deleting" },
    { $set: { status: "active" }, $unset: { deletingAt: "" } },
    { returnDocument: "after" }
  ).lean();
  return doc ? toSpaceDto(doc, "owner") : null;
}

export async function deleteSpace(
  id: string,
  ownerId: Types.ObjectId
): Promise<boolean> {
  const result = await SpaceModel.deleteOne({ _id: id, ownerId });
  return result.deletedCount > 0;
}

export async function countUserSpaces(ownerId: Types.ObjectId): Promise<number> {
  return SpaceModel.countDocuments({ ownerId, status: { $ne: "deleting" } });
}

export async function ensureDefaultSpace(
  owner: OwnerUserInfo
): Promise<SpaceDoc> {
  const existing = await SpaceModel.findOne({
    ownerId: owner.userId,
    type: "personal",
    status: { $ne: "deleting" },
  }).lean();

  if (existing) {
    // If legacy personal space missing members array, heal it
    if (!existing.members || existing.members.length === 0) {
      const healedMembers: SpaceMemberDoc[] = [
        {
          userId: owner.userId,
          email: owner.email.toLowerCase(),
          name: owner.name,
          username: owner.username ?? null,
          role: "owner",
          joinedAt: existing.createdAt || new Date(),
        },
      ];
      await SpaceModel.updateOne(
        { _id: existing._id },
        { $set: { members: healedMembers, isShared: false } }
      );
      existing.members = healedMembers;
      existing.isShared = false;
    }
    return toSpaceDto(existing, "owner");
  }

  const created = await SpaceModel.create({
    ownerId: owner.userId,
    name: "Personal",
    type: "personal",
    isShared: false,
    members: [
      {
        userId: owner.userId,
        email: owner.email.toLowerCase(),
        name: owner.name,
        username: owner.username ?? null,
        role: "owner",
        joinedAt: new Date(),
      },
    ],
    status: "active",
  });
  return toSpaceDto(created.toObject(), "owner");
}

function toSpaceDto(doc: Record<string, unknown>, role?: "owner" | "member"): SpaceDoc {
  return {
    ...doc,
    id: String(doc._id),
    role: role || (doc.role as "owner" | "member"),
  } as unknown as SpaceDoc;
}

export async function hasTransactions(spaceId: string): Promise<boolean> {
  const count = await TransactionModel.countDocuments({ spaceId });
  return count > 0;
}

export async function deleteTransactionsBySpace(spaceId: string): Promise<void> {
  await TransactionModel.deleteMany({ spaceId });
}

export async function deleteInvitationsBySpace(spaceId: string): Promise<void> {
  await SpaceInvitationModel.updateMany(
    { spaceId },
    { $set: { status: "canceled" }, $unset: { tokenHash: "" } }
  );
}

export async function deleteNotificationsBySpace(spaceId: string): Promise<void> {
  await NotificationModel.deleteMany({ "data.spaceId": spaceId });
}