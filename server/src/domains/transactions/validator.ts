import {
  transactionSchema,
  transactionUpdateSchema,
  transactionQuerySchema,
  idParamsSchema,
} from "../../shared/index.js";

import { BadRequestError } from "../../common/errors/index.js";

export function validateCreateTransaction(input: unknown) {
  const result = transactionSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid transaction payload");
  }

  return result.data;
}

export function validateUpdateTransaction(input: unknown) {
  const result = transactionUpdateSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid transaction payload");
  }

  return result.data;
}

export function validateTransactionId(param: unknown) {
  const result = idParamsSchema.safeParse(param);

  if (!result.success) {
    throw new BadRequestError("Invalid transaction id");
  }

  return result.data.id;
}

export function validateTransactionQuery(query: unknown) {
  const result = transactionQuerySchema.safeParse(query);

  if (!result.success) {
    throw new BadRequestError("Invalid query parameters");
  }

  return result.data;
}