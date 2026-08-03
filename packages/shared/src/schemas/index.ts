import { z } from "zod";

import {
  PAYMENT_METHODS,
  SPACE_TYPES,
  TRANSACTION_TYPES,
} from "../enums/index.js";

export const createUserSchema = z.object({
  clerkId: z.string().trim().min(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const spaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(SPACE_TYPES).default("personal"),
});

export type SpaceInput = z.infer<typeof spaceSchema>;

export const transactionSchema = z.object({
  category: z.string().trim().min(1).max(100),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive(),
  note: z.string().trim().max(500).default(""),
  date: z.string().datetime({ offset: true }).or(z.date()),
  tags: z.array(z.string().trim().min(1)).default([]),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
