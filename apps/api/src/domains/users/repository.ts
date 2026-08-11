import { Types } from "mongoose";

import { UserModel } from "./model.js";
import { SpaceModel } from "../spaces/model.js";

export async function findOrCreateUser(
  clerkId: string
): Promise<Types.ObjectId> {
  const existing = await UserModel.findOne({ clerkId }).select("_id").lean();

  if (existing) {
    return existing._id;
  }

  const created = await UserModel.create({ clerkId });
  await SpaceModel.create({
    ownerId: created._id,
    name: "Personal",
    type: "personal",
  });
  return created._id;
}