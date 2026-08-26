import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as userService from "./service.js";
import {
  USERNAME_REGEX,
  RESERVED_USERNAMES,
} from "../../shared/index.js";
import { validateEmailUpdate, validatePasswordChange, validateUsernameUpdate, validateProfileUpdate } from "./validator.js";

export const updateEmail = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const email = validateEmailUpdate(req.body);
    const user = await userService.changeEmail(req.user!, email);

    res.json({ success: true, data: { user } });
  }
);

export const changePassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = validatePasswordChange(req.body);
    const result = await userService.changePassword(
      req.user!,
      currentPassword,
      newPassword
    );

    res.json({ success: true, data: result });
  }
);

export const getProvider = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await userService.getAuthProvider(req.user!);
    res.json({ success: true, data: result });
  }
);

export const getProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await userService.getProfile(req.user!);
    res.json({ success: true, data: result });
  }
);

export const checkUsernameAvailable = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const raw = String(req.query.u ?? req.query.username ?? "").trim().toLowerCase();

    // Fast-path: format / reserved check — zero DB calls
    if (!USERNAME_REGEX.test(raw)) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: { available: false, reason: "3–30 chars: letters, numbers, underscores" } });
      return;
    }
    if (RESERVED_USERNAMES.has(raw)) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, data: { available: false, reason: "Username is reserved" } });
      return;
    }

    // Single index hit — countDocuments on the sparse unique `username` field
    // Uses the index only, never fetches a full document
    const { UserModel } = await import("./model.js");
    const filter: Record<string, unknown> = { username: raw };
    if (req.user?.id) {
      filter.betterAuthId = { $ne: req.user.id };
    }
    const count = await UserModel.countDocuments(filter);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        available: count === 0,
        reason: count > 0 ? "Username is already taken" : undefined,
      },
    });
  }
);

export const updateUsername = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { username } = validateUsernameUpdate(req.body);
    const result = await userService.updateUsername(req.user!, username);
    res.json({ success: true, data: result });
  }
);

export const updateProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = validateProfileUpdate(req.body);
    const result = await userService.updateProfile(req.user!, data);
    res.json({ success: true, data: result });
  }
);