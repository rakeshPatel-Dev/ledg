import type { Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";

import { UnauthorizedError } from "../errors/index.js";

export interface AuthRequest extends Request {
  clerkId?: string;
}

export const authenticate = [
  clerkMiddleware(),
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);

    if (!userId) {
      next(new UnauthorizedError("Invalid or missing session token"));
      return;
    }

    req.clerkId = userId;
    next();
  },
];