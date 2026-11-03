import { Types } from "mongoose";

/**
 * `customSession` already resolves the app User `_id` and puts it on the
 * session, which is also what gets stored in Better Auth's cookie cache.
 * Prefer that value and only fall back to a DB lookup when it is missing
 * (first request for a user created before this field existed).
 */
export function domainUserIdFromSession(sessionUser: {
  userId?: string | null;
}): Types.ObjectId | null {
  const raw = sessionUser.userId;
  if (!raw || !Types.ObjectId.isValid(raw)) return null;
  return new Types.ObjectId(raw);
}
