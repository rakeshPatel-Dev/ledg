import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as transactionService from "./service.js";
import {
  validateCreateTransaction,
  validateTransactionQuery,
  validateTransactionId,
  validateUpdateTransaction,
} from "./validator.js";

export const createTransaction = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = validateCreateTransaction(req.body);
    const transaction = await transactionService.createUserTransaction(
      req.userId!,
      String(req.params.spaceId),
      data
    );

    res.status(201).json({ success: true, data: { transaction } });
  }
);

export const listTransactions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const query = validateTransactionQuery(req.query);
    const data = await transactionService.listUserTransactions(
      req.userId!,
      String(req.params.spaceId),
      query
    );

    res.json({ success: true, data });
  }
);

export const getTransaction = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const transactionId = validateTransactionId(req.params);
    const transaction = await transactionService.getUserTransaction(
      req.userId!,
      String(req.params.spaceId),
      transactionId
    );

    res.json({ success: true, data: { transaction } });
  }
);

export const updateTransaction = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const transactionId = validateTransactionId(req.params);
    const data = validateUpdateTransaction(req.body);
    const transaction = await transactionService.updateUserTransaction(
      req.userId!,
      String(req.params.spaceId),
      transactionId,
      data
    );

    res.json({ success: true, data: { transaction } });
  }
);

export const deleteTransaction = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const transactionId = validateTransactionId(req.params);
    const result = await transactionService.deleteUserTransaction(
      req.userId!,
      String(req.params.spaceId),
      transactionId
    );

    res.json({ success: true, data: result });
  }
);