import mongoose from "mongoose";

import { connectDatabase } from "../../database/index.js";
import { logger } from "../../config/logger.js";
import { ConflictError, BadRequestError } from "../../common/errors/index.js";
import {
  updateUserEmail,
  isUsernameDuplicateKeyError,
  writeUniqueUsername,
  authUserFilter,
  type AuthUser,
} from "./repository.js";
import { UserModel } from "./model.js";
import { USERNAME_REGEX, RESERVED_USERNAMES } from "../../shared/index.js";

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

  const filter = authUserFilter(authUser.id);

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

export async function getProfile(authUser: AuthUser) {
  await connectDatabase();

  const user = await UserModel.findOne({ betterAuthId: authUser.id })
    .select("name fullName username email image emailVerified createdAt")
    .lean() as {
      _id: mongoose.Types.ObjectId;
      name?: string;
      fullName?: string;
      username?: string;
      email?: string;
      image?: string | null;
      emailVerified?: boolean;
      createdAt?: string;
    } | null;

  if (!user) throw new BadRequestError("User not found");

  let username = user.username ?? null;
  if (!username) {
    const emailPrefix = (user.email ?? authUser.email ?? "").split("@")[0] || user.name || authUser.name || "user";
    username = await writeUniqueUsername(user._id, emailPrefix);
  }

  const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
  const account = await db
    .collection("account")
    .findOne({ userId: new mongoose.Types.ObjectId(authUser.id) })
    .catch(() => null);

  return {
    name: user.name ?? "",
    fullName: user.fullName ?? "",
    username,
    email: user.email ?? "",
    image: user.image ?? null,
    emailVerified: user.emailVerified ?? false,
    provider: account?.providerId ?? "unknown",
    joinedAt: user.createdAt,
  };
}

const RECONCILE_ATTEMPTS = 3;
const USERNAME_SYNC_REPAIRS = "username_sync_repairs";

interface UsernameSyncRepairDoc {
  _id: string;
  filter: Record<string, unknown>;
  failedUsername: string;
  revert: Record<string, unknown>;
  updatedAt: Date;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supportsTransactions(hello: { setName?: string; msg?: string }): boolean {
  return Boolean(hello.setName) || hello.msg === "isdbgrid";
}

function isTransactionUnsupportedError(err: unknown): boolean {
  return (
    err instanceof Error &&
    /transaction numbers are only allowed on a replica set member or mongos/i.test(
      err.message
    )
  );
}

/**
 * Rolls the Better Auth user record back after a failed domain write. The
 * revert intent is persisted first so an interrupted rollback stays visible
 * and can be replayed; the revert itself only applies while the auth store
 * still holds the failed candidate value, making replays safe against
 * concurrent updates. Failures are retried, never silently ignored.
 */
async function reconcileAuthUsername(
  betterAuthId: string,
  filter: Record<string, unknown>,
  failedUsername: string,
  previousUsername: string | null
): Promise<boolean> {
  const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
  const repairs = db.collection<UsernameSyncRepairDoc>(USERNAME_SYNC_REPAIRS);
  const users = db.collection("user");
  const revert = previousUsername
    ? { $set: { username: previousUsername } }
    : { $unset: { username: "" } };

  await repairs.updateOne(
    { _id: betterAuthId },
    {
      $set: {
        filter,
        failedUsername,
        revert,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  let lastError: unknown;
  for (let attempt = 0; attempt < RECONCILE_ATTEMPTS; attempt++) {
    try {
      await users.updateOne(
        { ...filter, username: failedUsername },
        revert
      );
      // A leftover record here only replays an idempotent no-op revert.
      await repairs.deleteOne({ _id: betterAuthId }).catch(() => undefined);
      return true;
    } catch (err) {
      lastError = err;
      await delay(50 * 2 ** attempt);
    }
  }
  logger.error(
    { betterAuthId, error: lastError },
    "Failed to reconcile Better Auth username"
  );
  return false;
}

/** Replays a previously persisted username reconciliation if one exists. */
async function applyPendingUsernameRepair(betterAuthId: string): Promise<void> {
  const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
  const repairs = db.collection<UsernameSyncRepairDoc>(USERNAME_SYNC_REPAIRS);
  const repair = await repairs
    .findOne({ _id: betterAuthId })
    .catch(() => null);

  if (!repair) return;

  const users = db.collection("user");
  try {
    await users.updateOne(
      { ...repair.filter, username: repair.failedUsername },
      repair.revert
    );
    await repairs.deleteOne({ _id: betterAuthId }).catch(() => undefined);
  } catch (err) {
    logger.error({ betterAuthId, error: err }, "Failed to replay username sync repair");
  }
}

export async function checkUsernameAvailable(
  authUser: AuthUser,
  username: string
): Promise<{ available: boolean; reason?: string }> {
  await connectDatabase();

  const normalized = username.trim().toLowerCase();

  if (!USERNAME_REGEX.test(normalized)) {
    return { available: false, reason: "Only letters, numbers, and underscores (3–30 chars)" };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { available: false, reason: "Username is reserved" };
  }

  // Check if owned by another user
  const existing = await UserModel.findOne({ username: normalized })
    .select("betterAuthId")
    .lean() as { betterAuthId?: string } | null;

  if (existing && existing.betterAuthId !== authUser.id) {
    return { available: false, reason: "Username is already taken" };
  }

  return { available: true };
}

export async function updateUsername(
  authUser: AuthUser,
  username: string
): Promise<{ username: string }> {
  await connectDatabase();
  await applyPendingUsernameRepair(authUser.id);

  const normalized = username.trim().toLowerCase();

  if (!USERNAME_REGEX.test(normalized)) {
    throw new BadRequestError("Only letters, numbers, and underscores (3–30 chars)");
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    throw new BadRequestError("Username is reserved");
  }

  const conflict = await UserModel.findOne({ username: normalized })
    .select("betterAuthId")
    .lean() as { betterAuthId?: string } | null;

  if (conflict && conflict.betterAuthId !== authUser.id) {
    throw new ConflictError("Username is already taken");
  }

  const current = await UserModel.findOne({ betterAuthId: authUser.id })
    .select("username")
    .lean() as { username?: string | null } | null;

  const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
  const users = db.collection("user");
  const filter = authUserFilter(authUser.id);

  // Update the Better Auth record first and let failures propagate instead
  // of swallowing them — customSession must never serve a stale username
  // after the domain record has moved ahead of it. When the deployment
  // supports it both writes share one transaction so neither store can be
  // left behind; otherwise the fallback below reconciles explicitly.
  const hello = (await db.admin().command({ hello: 1 }).catch(() => null)) as {
    setName?: string;
    msg?: string;
  } | null;

  let committed = false;
  let txUnsupported = false;
  let txError: unknown;
  if (hello && supportsTransactions(hello)) {
    const session = await mongoose.connection.startSession();
    try {
      try {
        await session.withTransaction(async () => {
          await users.updateOne(
            filter,
            { $set: { username: normalized } },
            { session }
          );
          await UserModel.updateOne(
            { betterAuthId: authUser.id },
            { $set: { username: normalized } },
            { session }
          );
        });
        committed = true;
      } catch (err) {
        txError = err;
        txUnsupported = isTransactionUnsupportedError(err);
      }
    } finally {
      await session.endSession();
    }

    if (committed) {
      return { username: normalized };
    }
    if (!txUnsupported) {
      // The aborted transaction left no partial effects in either store.
      if (isUsernameDuplicateKeyError(txError)) {
        throw new ConflictError("Username is already taken");
      }
      throw txError;
    }
  }

  await users.updateOne(filter, { $set: { username: normalized } });
  try {
    await UserModel.updateOne(
      { betterAuthId: authUser.id },
      { $set: { username: normalized } }
    );
  } catch (err) {
    // Domain write lost a race or failed: reconcile Better Auth back to the
    // previous username via persisted, retried reconciliation instead of an
    // ignored rollback, then surface the original outcome.
    await reconcileAuthUsername(
      authUser.id,
      filter,
      normalized,
      current?.username ?? null
    );
    if (isUsernameDuplicateKeyError(err)) {
      throw new ConflictError("Username is already taken");
    }
    throw err;
  }

  return { username: normalized };
}

export async function updateProfile(
  authUser: AuthUser,
  data: { name?: string; username?: string }
): Promise<{ name: string; username: string | null }> {
  await connectDatabase();

  const updates: Record<string, string> = {};

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed) throw new BadRequestError("Name cannot be empty");
    updates.name = trimmed;
    updates.fullName = trimmed;
  }

  if (data.username !== undefined) {
    const result = await updateUsername(authUser, data.username);
    updates.username = result.username;
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("No fields to update");
  }

  const updated = await UserModel.findOneAndUpdate(
    { betterAuthId: authUser.id },
    { $set: updates },
    { returnDocument: "after" }
  )
    .select("name username")
    .lean() as { name?: string; username?: string } | null;

  // Keep the Better Auth user record in sync with a successful name change
  if (updates.name) {
    const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
    await db.collection("user").updateOne(authUserFilter(authUser.id), {
      $set: { name: updates.name },
    });
  }

  return {
    name: updated?.name ?? "",
    username: updated?.username ?? null,
  };
}