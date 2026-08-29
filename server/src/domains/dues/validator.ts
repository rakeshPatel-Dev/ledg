import {
  debtCreateSchema,
  debtSettlementSchema,
  duesQuerySchema,
  idParamsSchema,
} from "../../shared/index.js";
import { BadRequestError } from "../../common/errors/index.js";

export function validateCreateDue(input: unknown) {
  const result = debtCreateSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError("Invalid due payload");
  }
  return result.data;
}

export function validateSettleDue(input: unknown) {
  const result = debtSettlementSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError("Invalid settlement payload");
  }
  return result.data;
}

export function validateDuesQuery(input: unknown) {
  const result = duesQuerySchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError("Invalid dues query parameters");
  }
  return result.data;
}

export function validateDueId(param: unknown) {
  const result = idParamsSchema.safeParse(param);
  if (!result.success) {
    throw new BadRequestError("Invalid due id");
  }
  return result.data.id;
}

export function validateSettlementId(param: unknown) {
  const result = idParamsSchema.safeParse({ id: (param as { sid?: string })?.sid });
  if (!result.success) {
    throw new BadRequestError("Invalid settlement id");
  }
  return result.data.id;
}
