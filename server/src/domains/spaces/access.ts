import { Types } from "mongoose";

import { ForbiddenError, NotFoundError, BadRequestError } from "../../common/errors/index.js";
import { SpaceModel, type SpaceDoc } from "./model.js";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export interface SpaceAccess {
  space: SpaceDoc;
  role: "owner" | "member";
}

export async function resolveSpaceAccess(
  spaceId: string,
  userId: Types.ObjectId
): Promise<SpaceAccess | null> {
  if (!OBJECT_ID_RE.test(spaceId)) {
    return null;
  }

  const space = await SpaceModel.findOne({
    _id: spaceId,
    status: { $ne: "deleting" },
    $or: [{ ownerId: userId }, { "members.userId": userId }],
  }).lean();

  if (!space) {
    return null;
  }

  const role: "owner" | "member" =
    space.ownerId.toString() === userId.toString() ? "owner" : "member";

  return {
    space: { ...space, id: String(space._id) } as unknown as SpaceDoc,
    role,
  };
}

export async function assertSpaceAccess(
  spaceId: string,
  userId: Types.ObjectId
): Promise<SpaceAccess> {
  if (!OBJECT_ID_RE.test(spaceId)) {
    throw new BadRequestError("Invalid space id");
  }

  const access = await resolveSpaceAccess(spaceId, userId);
  if (!access) {
    throw new NotFoundError("Space");
  }

  return access;
}

export async function assertSpaceOwner(
  spaceId: string,
  userId: Types.ObjectId
): Promise<SpaceDoc> {
  if (!OBJECT_ID_RE.test(spaceId)) {
    throw new BadRequestError("Invalid space id");
  }

  const access = await assertSpaceAccess(spaceId, userId);
  if (access.role !== "owner") {
    throw new ForbiddenError("Only the space owner can perform this action");
  }

  return access.space;
}
