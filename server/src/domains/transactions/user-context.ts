import { Types } from "mongoose";

import { NotFoundError } from "../../common/errors/index.js";
import { UserModel } from "../users/model.js";

export interface TransactionUserContext {
  userId: Types.ObjectId;
  name: string;
  email: string;
  username: string | null;
}

export async function getUserContext(
  userId: Types.ObjectId
): Promise<TransactionUserContext> {
  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");
  return {
    userId: user._id,
    name: user.name || "Ledg User",
    email: user.email,
    username: user.username ?? null,
  };
}
