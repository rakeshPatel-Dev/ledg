import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Types } from "mongoose";

import { UnauthorizedError } from "../errors/index.js";
import { getAuth } from "../../auth.js";
import { resolveUserIdFromAuth } from "../../domains/users/repository.js";

export interface AuthRequest extends Request {
  userId?: Types.ObjectId;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified?: boolean;
  };
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

    const userId = await resolveUserIdFromAuth(session.user);
    req.userId = userId;
    req.user = session.user;
    next();
  } catch (error) {
    next(error);
  }
}