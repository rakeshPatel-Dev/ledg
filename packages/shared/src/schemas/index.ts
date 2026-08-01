import { z } from "zod";

import {
  CATEGORY_TYPES,
  PAYMENT_METHODS,
  SPACE_TYPES,
  TRANSACTION_TYPES,
} from "../enums/index.js";

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(100),
  image: z.string().nullable().optional(),
});

export const createUserSchema = userSchema.extend({
  clerkId: z.string().trim().min(1),
});

export type UserInput = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const spaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(SPACE_TYPES).default("personal"),
});

export type SpaceInput = z.infer<typeof spaceSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  type: z.enum(CATEGORY_TYPES),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const transactionSchema = z.object({
  categoryId: z.string().nullable().optional(),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive(),
  note: z.string().trim().max(500).default(""),
  date: z.string().datetime({ offset: true }).or(z.date()),
  tags: z.array(z.string().trim().min(1)).default([]),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
