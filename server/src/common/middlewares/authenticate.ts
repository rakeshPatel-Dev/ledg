import type { Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Types } from "mongoose";

import { UnauthorizedError } from "../errors/index.js";
import { findUserByClerkId } from "../../domains/users/repository.js";

export interface AuthRequest extends Request {
  userId?: Types.ObjectId;
}

export const authenticate = [
  clerkMiddleware(),
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const { userId: clerkId } = getAuth(req);

      if (!clerkId) {
        throw new UnauthorizedError("Invalid or missing session token");
      }

      const userId = await findUserByClerkId(clerkId);
      req.userId = userId;
      next();
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        return next(new UnauthorizedError("User not found in database"));
      }
      next(error);
    }
  },
];