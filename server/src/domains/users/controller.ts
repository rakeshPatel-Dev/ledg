import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as userService from "./service.js";
import { validateEmailUpdate } from "./validator.js";

export const updateEmail = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const email = validateEmailUpdate(req.body);
    const user = await userService.changeEmail(req.user!, email);

    res.json({ success: true, data: { user } });
  }
);