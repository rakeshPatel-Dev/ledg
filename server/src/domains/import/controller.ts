import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as importService from "./service.js";
import { validateImport } from "./validator.js";

export const importTransactions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const input = validateImport(req.body);
    const result = await importService.importTransactions(req.userId!, input);

    res.status(201).json({ success: true, data: result });
  }
);
