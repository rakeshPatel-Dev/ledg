import { z } from "zod";

import { BadRequestError } from "../../common/errors/index.js";

const USERNAME_SCHEMA = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores are allowed");

const emailUpdateSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255, "Email is too long"),
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

const usernameUpdateSchema = z.object({
  username: USERNAME_SCHEMA,
});

export function validateUsernameUpdate(input: unknown): { username: string } {
  const result = usernameUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError(
      result.error.issues[0]?.message ?? "Invalid username"
    );
  }
  return result.data;
}

const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long").optional(),
  username: USERNAME_SCHEMA.optional(),
});

export function validateProfileUpdate(input: unknown): { name?: string; username?: string } {
  const result = profileUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError(
      result.error.issues[0]?.message ?? "Invalid profile data"
    );
  }
  return result.data;
}