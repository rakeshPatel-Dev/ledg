import { z } from "zod";

import { BadRequestError } from "../../common/errors/index.js";

const emailUpdateSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export function validateEmailUpdate(input: unknown): string {
  const result = emailUpdateSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError(
      result.error.issues[0]?.message ?? "Invalid email address"
    );
  }

  return result.data.email;
}