import { Types } from "mongoose";


import { RESERVED_USERNAMES } from "../../shared/index.js";
import { UserModel } from "./model.js";
import { SpaceModel } from "../spaces/model.js";
import { TransactionModel } from "../transactions/model.js";
import { NotificationModel, NotificationPreferenceModel } from "../notifications/model.js";

export interface AuthUser {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

/**
 * Builds an `_id` filter for the Better Auth `user` collection, which may
 * store ids as ObjectId or as plain strings depending on how the account
 * was created.
 */
export function authUserFilter(betterAuthId: string): Record<string, unknown> {
  return /^[0-9a-fA-F]{24}$/.test(betterAuthId)
    ? { _id: new Types.ObjectId(betterAuthId) }
    : { _id: betterAuthId };
}

/** Derives a safe base username from an email prefix or name */
function deriveBase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24)
    .padEnd(3, "0");
}

/** Generates a unique username, appending digits on collision */
export async function generateUsername(emailOrName: string): Promise<string> {
  const base = deriveBase(emailOrName);
  const safe = RESERVED_USERNAMES.has(base) ? `${base}_user` : base;

  if (!await UserModel.exists({ username: safe })) return safe;

  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = `${safe.slice(0, 24)}_${suffix}`;
    if (!await UserModel.exists({ username: candidate })) return candidate;
  }

  return `${safe.slice(0, 18)}_${Date.now().toString().slice(-6)}`;
}

const USERNAME_ALLOC_ATTEMPTS = 5;

/**
 * Duplicate-key errors from the unique username index. Existence checks in
 * generateUsername are not atomic, so concurrent writers can race; callers
 * must retry allocation when the write reports a collision.
 */
export function isUsernameDuplicateKeyError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
  if (e.code !== 11000) return false;
  if (e.keyPattern && typeof e.keyPattern === "object") {
    return "username" in e.keyPattern;
  }
  return (e.message ?? "").includes("username");
}

/**
 * Writes a generated username, regenerating candidates on duplicate-key
 * races until one is reserved by the write itself.
 */
export async function writeUniqueUsername(
  userId: Types.ObjectId,
  source: string
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < USERNAME_ALLOC_ATTEMPTS; attempt++) {
    const candidate = await generateUsername(source);
    try {
      await UserModel.updateOne(
        { _id: userId },
        { $set: { username: candidate } }
      );
      return candidate;
    } catch (err) {
      lastError = err;
      if (!isUsernameDuplicateKeyError(err)) throw err;
    }
  }
  throw lastError ?? new Error("Failed to allocate a unique username");
}

export async function upsertUserFromAuth(
  authUser: AuthUser
): Promise<Types.ObjectId> {
  const update: Record<string, unknown> = {
    email: authUser.email ?? "",
    name: authUser.name ?? "",
    fullName: authUser.name ?? "",
    emailVerified: authUser.emailVerified ?? false,
  };

  if (authUser.image) {
    update.image = authUser.image;
  }

  const emailPrefix =
    (authUser.email ?? "").split("@")[0] || authUser.name || "user";

  // The username is reserved by the upsert write itself; a duplicate-key
  // error means another concurrent allocation won the race, so regenerate
  // and retry with a fresh candidate.
  let lastError: unknown;
  for (let attempt = 0; attempt < USERNAME_ALLOC_ATTEMPTS; attempt++) {
    const setOnInsert: Record<string, unknown> = {
      betterAuthId: authUser.id,
    };

    if (authUser.username) {
      setOnInsert.username = authUser.username;
    } else {
      setOnInsert.username = await generateUsername(emailPrefix);
    }

    try {
      const user = await UserModel.findOneAndUpdate(
        { betterAuthId: authUser.id },
        {
          $set: update,
          $setOnInsert: setOnInsert,
        },
        { upsert: true, returnDocument: "after" }
      )
        .select("_id")
        .lean();

      if (!user) {
        throw new Error("Failed to find or create user");
      }

      return user._id;
    } catch (err) {
      lastError = err;
      if (!authUser.username && isUsernameDuplicateKeyError(err)) continue;
      throw err;
    }
  }

  throw lastError ?? new Error("Failed to find or create user");
}

export async function resolveUserIdFromAuth(
  authUser: AuthUser
): Promise<Types.ObjectId> {
  const existing = await UserModel.findOne({
    betterAuthId: authUser.id,
  })
    .select("_id username email name")
    .lean() as { _id: Types.ObjectId; username?: string; email?: string; name?: string } | null;

  if (existing) {
    if (!existing.username) {
      const emailPrefix = (authUser.email ?? existing.email ?? "").split("@")[0] || authUser.name || existing.name || "user";
      await writeUniqueUsername(existing._id, emailPrefix);
    }
    return existing._id;
  }

  return upsertUserFromAuth(authUser);
}

export async function updateUserEmail(
  betterAuthId: string,
  email: string
): Promise<void> {
  await UserModel.updateOne(
    { betterAuthId },
    { $set: { email, emailVerified: false } }
  );
}

export async function deleteUserWithData(betterAuthId: string): Promise<void> {
  const user = await UserModel.findOne({ betterAuthId }).lean();
  if (!user) return;

  // Check if user owns any shared space with other members
  const ownedSharedSpaces = await SpaceModel.find({
    ownerId: user._id,
    isShared: true,
  }).lean();

  if (ownedSharedSpaces.length > 0) {
    throw new Error(
      "Cannot delete account while you own shared spaces with other members. Please transfer ownership or delete those spaces first."
    );
  }

  // If user is a member of other shared spaces, remove them and notify owners
  const memberSpaces = await SpaceModel.find({
    ownerId: { $ne: user._id },
    "members.userId": user._id,
  });

  for (const space of memberSpaces) {
    const updatedMembers = space.members.filter(
      (m: { userId: { toString: () => string } }) => m.userId.toString() !== user._id.toString()
    );
    const isShared = updatedMembers.some((m: { role: string }) => m.role === "member");
    await SpaceModel.updateOne(
      { _id: space._id },
      { $set: { members: updatedMembers, isShared } }
    );
  }

  // Delete owned spaces & their transactions
  const spaceIds = await SpaceModel.find({ ownerId: user._id })
    .select("_id")
    .lean();
  const ids = spaceIds.map((space) => space._id);

  if (ids.length > 0) {
    await TransactionModel.deleteMany({ spaceId: { $in: ids } });
    await SpaceModel.deleteMany({ _id: { $in: ids } });
  }

  // Cleanup notifications & preferences
  

  await NotificationModel.deleteMany({ userId: user._id }).catch(() => null);
  await NotificationPreferenceModel.deleteMany({ userId: user._id }).catch(() => null);

  await UserModel.deleteOne({ _id: user._id });
}

