import mongoose from "mongoose";

import { connectDatabase } from "../../database/index.js";
import { ConflictError } from "../../common/errors/index.js";
import {
  updateUserEmail,
  type AuthUser,
} from "./repository.js";

export async function changeEmail(
  authUser: AuthUser,
  email: string
): Promise<{ email: string }> {
  await connectDatabase();

  const normalized = email.trim().toLowerCase();
  const authUsers = mongoose.connection
    .getClient()
    .db(process.env.MONGODB_DB_NAME)
    .collection("user");

  const existing = await authUsers.findOne({ email: normalized });
  if (existing) {
    const existingId = String(existing._id);
    if (existingId !== authUser.id) {
      throw new ConflictError("That email is already in use");
    }
    return { email: normalized };
  }

  let filter: Record<string, unknown>;
  try {
    filter = { _id: new mongoose.Types.ObjectId(authUser.id) };
  } catch {
    filter = { _id: authUser.id };
  }

  await authUsers.updateOne(filter, {
    $set: { email: normalized, emailVerified: false },
  });
  await updateUserEmail(authUser.id, normalized);

  return { email: normalized };
}