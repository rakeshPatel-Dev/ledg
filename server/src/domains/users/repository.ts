import { Types } from "mongoose";

import { UserModel } from "./model.js";
import { SpaceModel } from "../spaces/model.js";
import { TransactionModel } from "../transactions/model.js";

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

export async function upsertUserFromAuth(
  authUser: AuthUser
): Promise<Types.ObjectId> {
  const user = await UserModel.findOneAndUpdate(
    { betterAuthId: authUser.id },
    {
      $set: {
        email: authUser.email ?? "",
        name: authUser.name ?? "",
        fullName: authUser.name ?? "",
        image: authUser.image ?? null,
        emailVerified: authUser.emailVerified ?? false,
      },
      $setOnInsert: { betterAuthId: authUser.id },
    },
    { upsert: true, returnDocument: "after" }
  )
    .select("_id")
    .lean();

  if (!user) {
    throw new Error("Failed to find or create user");
  }

  return user._id;
}

export async function resolveUserIdFromAuth(
  authUser: AuthUser
): Promise<Types.ObjectId> {
  const existing = await UserModel.findOne({
    betterAuthId: authUser.id,
  })
    .select("_id")
    .lean();

  if (existing) {
    return existing._id;
  }

  return upsertUserFromAuth(authUser);
}

export async function deleteUserWithData(betterAuthId: string): Promise<void> {
  const user = await UserModel.findOne({ betterAuthId }).select("_id").lean();
  if (!user) return;

  const spaceIds = await SpaceModel.find({ ownerId: user._id })
    .select("_id")
    .lean();
  const ids = spaceIds.map((space) => space._id);

  if (ids.length > 0) {
    await TransactionModel.deleteMany({ spaceId: { $in: ids } });
    await SpaceModel.deleteMany({ _id: { $in: ids } });
  }

  await UserModel.deleteOne({ _id: user._id });
}
