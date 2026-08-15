import { spaceSchema, spaceUpdateSchema, idParamsSchema } from "../../shared/index.js";

import { BadRequestError } from "../../common/errors/index.js";

export function validateCreateSpace(input: unknown) {
  const result = spaceSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid space payload");
  }

  return result.data;
}

export function validateUpdateSpace(input: unknown) {
  const result = spaceUpdateSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid space payload");
  }

  return result.data;
}

export function validateSpaceId(param: unknown) {
  const result = idParamsSchema.safeParse(param);

  if (!result.success) {
    throw new BadRequestError("Invalid space id");
  }

  return result.data.id;
}