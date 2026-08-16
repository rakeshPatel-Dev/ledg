import { z } from "zod";

import {
  PAYMENT_METHODS,
  SPACE_TYPES,
  TRANSACTION_TYPES,
} from "../enums/index.js";

export const createUserSchema = z.object({
  betterAuthId: z.string().trim().min(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const spaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(SPACE_TYPES).default("personal"),
});

export type SpaceInput = z.infer<typeof spaceSchema>;

export const spaceUpdateSchema = spaceSchema.partial();

export type SpaceUpdateInput = z.infer<typeof spaceUpdateSchema>;

const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const transactionSchema = z.object({
  category: z.string().trim().min(1).max(100),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive(),
  note: z.string().trim().max(500).default(""),
  date: dateStringSchema.or(z.date()),
  tags: z.array(z.string().trim().min(1)).default([]),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionUpdateSchema = transactionSchema.partial();

export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;

export const idParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export type IdParams = z.infer<typeof idParamsSchema>;

export const transactionQuerySchema = z.object({
  category: z.string().trim().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  keyword: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
