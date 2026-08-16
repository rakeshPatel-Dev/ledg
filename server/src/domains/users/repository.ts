import { Types } from "mongoose";

import { UserModel } from "./model.js";

export async function findUserByClerkId(
  clerkId: string
): Promise<Types.ObjectId> {
  const existing = await UserModel.findOne({ clerkId }).select("_id").lean();

  if (!existing) {
    throw new Error("User not found");
  }

  return existing._id;
}