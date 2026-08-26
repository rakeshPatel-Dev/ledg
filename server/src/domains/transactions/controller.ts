import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import { BadRequestError } from "../../common/errors/index.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import { transactionQuerySchema } from "../../shared/index.js";
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

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export const listAllTransactions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const parsed = transactionQuerySchema
      .pick({ page: true, pageSize: true, type: true, keyword: true })
      .safeParse(req.query);

    if (!parsed.success) {
      throw new BadRequestError("Invalid query parameters");
    }

    let spaceId: string | undefined;
    if (typeof req.query.spaceId === "string" && req.query.spaceId.trim()) {
      spaceId = req.query.spaceId.trim();
      if (spaceId !== "all" && !OBJECT_ID_RE.test(spaceId)) {
        throw new BadRequestError("Invalid space id");
      }
    }

    const data = await transactionService.listAllUserTransactions(
      req.userId!,
      parsed.data.page,
      parsed.data.pageSize,
      {
        type: parsed.data.type,
        keyword: parsed.data.keyword,
        spaceId,
      }
    );

    res.json({ success: true, data });
  }
);