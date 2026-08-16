import { Types } from "mongoose";

import { UserModel } from "./model.js";

export async function findUserByClerkId(
  clerkId: string
): Promise<Types.ObjectId> {
  const user = await UserModel.findOneAndUpdate(
    { clerkId },
    { $setOnInsert: { clerkId } },
    { upsert: true, returnDocument: "after" }
  )
    .select("_id")
    .lean();

  if (!user) {
    throw new Error("Failed to find or create user");
  }

  return user._id;
}