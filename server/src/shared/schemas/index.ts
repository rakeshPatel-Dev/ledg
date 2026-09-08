import { z } from "zod";

import {
  DEBT_DIRECTIONS,
  DEBT_STATUSES,
  PAYMENT_METHODS,
  SPACE_TYPES,
  TRANSACTION_ACTIVITY_MODES,
  TRANSACTION_SOURCES,
  TRANSACTION_TYPES,
} from "../enums/index.js";

const inviteIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Email or username is required")
  .max(255, "Identifier is too long");

export const spaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(SPACE_TYPES).default("personal"),
  monthlyBudget: z.number().nonnegative().nullable().optional(),
  inviteeIdentifiers: z
    .array(inviteIdentifierSchema)
    .max(10, "Cannot invite more than 10 members at once")
    .optional(),
});

export type SpaceInput = z.infer<typeof spaceSchema>;

export const spaceUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(SPACE_TYPES).optional(),
  monthlyBudget: z.number().nonnegative().nullable().optional(),
});

export type SpaceUpdateInput = z.infer<typeof spaceUpdateSchema>;

export const spaceMemberInviteSchema = z.object({
  identifier: inviteIdentifierSchema,
});

export type SpaceMemberInviteInput = z.infer<typeof spaceMemberInviteSchema>;


export const spaceTransferOwnershipSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user id"),
});

export type SpaceTransferOwnershipInput = z.infer<typeof spaceTransferOwnershipSchema>;

export const inviteAcceptByTokenSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
});

export type InviteAcceptByTokenInput = z.infer<typeof inviteAcceptByTokenSchema>;

export const notificationPreferencesSchema = z.object({
  transactionActivity: z.enum(TRANSACTION_ACTIVITY_MODES).optional(),
  inviteEvents: z.boolean().optional(),
  memberChanges: z.boolean().optional(),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;


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
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
  source: z.enum(TRANSACTION_SOURCES).default("manual"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionUpdateSchema = transactionSchema
  .partial()
  .extend({
    fromSpaceId: z.string().trim().min(1).optional(),
  });

export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;

export const idParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid id"),
});

export type IdParams = z.infer<typeof idParamsSchema>;

export const transactionQuerySchema = z.object({
  category: z.string().trim().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  keyword: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;

export const debtCreateSchema = z.object({
  direction: z.enum(DEBT_DIRECTIONS),
  counterparty: z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
    phone: z.string().trim().max(30).optional(),
    linkedUserId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid user id")
      .nullable()
      .optional(),
  }),
  principal: z.number().positive("Principal must be greater than 0"),
  date: dateStringSchema.or(z.date()),
  dueDate: dateStringSchema.or(z.date()).nullable().optional(),
  note: z.string().trim().max(500).default(""),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
  spaceId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid space id")
    .optional(),
});

export type DebtCreateInput = z.infer<typeof debtCreateSchema>;

export const debtSettlementSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  date: dateStringSchema.or(z.date()),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
  note: z.string().trim().max(500).default(""),
});

export type DebtSettlementInput = z.infer<typeof debtSettlementSchema>;

export const duesQuerySchema = z.object({
  status: z.enum([...DEBT_STATUSES, "all"]).optional(),
  direction: z.enum(DEBT_DIRECTIONS).optional(),
  person: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type DuesQuery = z.infer<typeof duesQuerySchema>;
