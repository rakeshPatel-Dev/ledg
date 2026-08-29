import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as duesService from "./service.js";
import {
  validateCreateDue,
  validateDueId,
  validateDuesQuery,
  validateSettlementId,
  validateSettleDue,
} from "./validator.js";

export const createDue = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = validateCreateDue(req.body);
    const due = await duesService.createDue(req.userId!, data);

    res.status(201).json({ success: true, data: { due } });
  }
);

export const listDues = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const query = validateDuesQuery(req.query);
    const data = await duesService.listDues(req.userId!, query);

    res.json({ success: true, data });
  }
);

export const getDue = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const debtId = validateDueId(req.params);
    const due = await duesService.getDue(req.userId!, debtId);

    res.json({ success: true, data: { due } });
  }
);

export const settleDue = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const debtId = validateDueId(req.params);
    const data = validateSettleDue(req.body);
    const result = await duesService.settleDue(req.userId!, debtId, data);

    res.status(201).json({ success: true, data: result });
  }
);

export const undoSettlement = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const debtId = validateDueId(req.params);
    const settlementId = validateSettlementId(req.params);
    const due = await duesService.undoSettlement(req.userId!, debtId, settlementId);

    res.json({ success: true, data: { due } });
  }
);

export const deleteDue = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const debtId = validateDueId(req.params);
    const result = await duesService.deleteDue(req.userId!, debtId);

    res.json({ success: true, data: result });
  }
);

export const getDuesSummary = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = await duesService.getDuesSummary(req.userId!);

    res.json({ success: true, data });
  }
);
