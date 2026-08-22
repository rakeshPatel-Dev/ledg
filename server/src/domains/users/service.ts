import mongoose from "mongoose";

import { connectDatabase } from "../../database/index.js";
import { ConflictError, BadRequestError } from "../../common/errors/index.js";
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

export async function changePassword(
  authUser: AuthUser,
  currentPassword: string,
  newPassword: string
): Promise<{ success: true }> {
  await connectDatabase();

  const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
  const accounts = db.collection("account");
  const sessions = db.collection("session");

  // Find the credential account for this user
  const account = await accounts.findOne({
    userId: new mongoose.Types.ObjectId(authUser.id),
    providerId: "credential",
  });

  if (!account || !account.password) {
    throw new BadRequestError("No password set for this account");
  }

  // Verify current password
  const { verifyPassword } = await import("better-auth/crypto");
  const valid = await verifyPassword({
    password: currentPassword,
    hash: account.password,
  });

  if (!valid) {
    throw new BadRequestError("Current password is incorrect");
  }

  // Hash new password and update
  const { hashPassword } = await import("better-auth/crypto");
  const newHash = await hashPassword(newPassword);

  await accounts.updateOne(
    { _id: account._id },
    { $set: { password: newHash } }
  );

  // Invalidate all sessions except current
  await sessions.deleteMany({
    userId: new mongoose.Types.ObjectId(authUser.id),
  });

  return { success: true };
}

export async function getAuthProvider(
  authUser: AuthUser
): Promise<{ provider: string }> {
  await connectDatabase();

  const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
  const accounts = db.collection("account");

  const account = await accounts
    .findOne({ userId: new mongoose.Types.ObjectId(authUser.id) })
    .catch(() => null);

  return { provider: account?.providerId ?? "unknown" };
}