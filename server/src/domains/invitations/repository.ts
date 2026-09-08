import crypto from "node:crypto";
import { Types } from "mongoose";

import {
  SpaceInvitationModel,
  type SpaceInvitationDoc,
} from "./model.js";

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export async function findPendingInvitationsByEmail(
  email: string,
  userId?: Types.ObjectId | string
): Promise<SpaceInvitationDoc[]> {
  const normalized = email.toLowerCase().trim();
  const filter: Record<string, unknown> = {
    status: "pending",
    expiresAt: { $gt: new Date() },
  };
  // Match by inviteeEmail OR inviteeId so a user who changed their email
  // after being invited still sees their pending invites (see H1).
  filter.$or = userId
    ? [
        { inviteeEmail: normalized },
        { inviteeId: new Types.ObjectId(String(userId)) },
      ]
    : [{ inviteeEmail: normalized }];

  const docs = await SpaceInvitationModel.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return docs.map(toInvitationDto);
}

export async function findPendingInvitationsBySpace(
  spaceId: string
): Promise<SpaceInvitationDoc[]> {
  const docs = await SpaceInvitationModel.find({
    spaceId: new Types.ObjectId(spaceId),
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  return docs.map(toInvitationDto);
}

export async function findInvitationById(
  id: string
): Promise<SpaceInvitationDoc | null> {
  const doc = await SpaceInvitationModel.findById(id).lean();
  return doc ? toInvitationDto(doc) : null;
}

export async function findInvitationByTokenHash(
  tokenHash: string
): Promise<SpaceInvitationDoc | null> {
  const doc = await SpaceInvitationModel.findOne({
    tokenHash,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).lean();

  return doc ? toInvitationDto(doc) : null;
}

export async function countPendingInvitationsByOwner(
  inviterId: Types.ObjectId
): Promise<number> {
  return SpaceInvitationModel.countDocuments({
    inviterId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
}

export async function countPendingInvitationsBySpace(
  spaceId: Types.ObjectId | string
): Promise<number> {
  return SpaceInvitationModel.countDocuments({
    spaceId: new Types.ObjectId(String(spaceId)),
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
}

export async function createInvitationDoc(data: {
  spaceId: Types.ObjectId;
  spaceName: string;
  inviterId: Types.ObjectId;
  inviterName: string;
  inviterUsername?: string | null;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeUsername?: string | null;
  tokenHash: string;
  expiresAt: Date;
}): Promise<SpaceInvitationDoc> {
  const doc = await SpaceInvitationModel.create({
    ...data,
    inviteeEmail: data.inviteeEmail.toLowerCase().trim(),
    role: "member",
    status: "pending",
  });
  return toInvitationDto(doc.toObject());
}

function toInvitationDto(
  doc: Record<string, unknown>
): SpaceInvitationDoc {
  return {
    ...doc,
    id: String(doc._id),
  } as unknown as SpaceInvitationDoc;
}
