import { importSchema } from "../../shared/index.js";

import { BadRequestError } from "../../common/errors/index.js";

export function validateImport(input: unknown) {
  const result = importSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid import payload");
  }

  return result.data;
}
