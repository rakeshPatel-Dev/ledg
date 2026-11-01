import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { Types } from "mongoose";

import { UnauthorizedError } from "../errors/index.js";
import { getAuth } from "../../auth.js";
import { resolveUserIdFromAuth } from "../../domains/users/repository.js";

export interface AuthRequest extends Request {
  userId?: Types.ObjectId;
  user?: {
    id: string;
    name: string;
    username?: string | null;
    /** App User `_id` — the id that transactions and spaces reference. */
    userId?: string | null;
    email: string;
    image?: string | null;
    emailVerified?: boolean;
  };
}

/**
 * `customSession` already resolves the app User `_id` and puts it on the
 * session, which is also what gets stored in Better Auth's cookie cache.
 * Prefer that value and only fall back to a DB lookup when it is missing
 * (first request for a user created before this field existed).
 */
function domainUserIdFromSession(
  sessionUser: { userId?: string | null }
): Types.ObjectId | null {
  const raw = sessionUser.userId;
  if (!raw || !Types.ObjectId.isValid(raw)) return null;
  return new Types.ObjectId(raw);
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      throw new UnauthorizedError("Invalid or missing session");
    }

    const userId =
      domainUserIdFromSession(session.user) ??
      (await resolveUserIdFromAuth(session.user));

    req.userId = userId;
    req.user = session.user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    }).catch(() => null);

    if (session?.user) {
      req.user = session.user;
      const userId =
        domainUserIdFromSession(session.user) ??
        (await resolveUserIdFromAuth(session.user).catch(() => undefined));
      req.userId = userId;
    }
    next();
  } catch {
    next();
  }
}