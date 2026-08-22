import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as userService from "./service.js";
import { validateEmailUpdate, validatePasswordChange } from "./validator.js";

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