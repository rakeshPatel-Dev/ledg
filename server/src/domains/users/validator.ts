import { z } from "zod";

import { BadRequestError } from "../../common/errors/index.js";

const emailUpdateSchema = z.object({
  email: z.email("Please enter a valid email address").max(255, "Email is too long"),
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

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters"),
});

export function validatePasswordChange(input: unknown): {
  currentPassword: string;
  newPassword: string;
} {
  const result = passwordChangeSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError(
      result.error.issues[0]?.message ?? "Invalid password data"
    );
  }

  return result.data;
}